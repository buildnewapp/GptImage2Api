import { applyPricingRowToPayload } from "@/lib/ai-studio/runtime";
import type { AiStudioPublicPricingRow } from "@/lib/ai-studio/public";
import type {
  AiVideoStudioFamilyKey,
  AiVideoStudioVersionKey,
} from "@/config/ai-video-studio";
import {
  AI_VIDEO_STUDIO_FAMILIES,
  getAiVideoStudioVersions,
} from "@/config/ai-video-studio";

export const AI_VIDEO_STUDIO_FORM_STORAGE_KEY = "ai-video-studio-form";

export type AiVideoStudioFormValues = Record<string, unknown>;

export type AiVideoStudioStoredState = {
  familyKey: AiVideoStudioFamilyKey;
  versionKey: AiVideoStudioVersionKey;
  isPublic: boolean;
  formValues: AiVideoStudioFormValues;
};

function shouldOmitValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  if (Array.isArray(value) && value.length === 0) {
    return true;
  }

  return false;
}

function pruneAiVideoStudioFormValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    const next = value.filter((item) => !shouldOmitValue(item));
    return next.length > 0 ? next : undefined;
  }

  if (!value || typeof value !== "object") {
    return shouldOmitValue(value) ? undefined : value;
  }

  const next: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const pruned = pruneAiVideoStudioFormValues(child);
    if (pruned !== undefined) {
      next[key] = pruned;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function usesInputEnvelope(detail: {
  requestSchema?: Record<string, any> | null;
  examplePayload?: Record<string, any> | null;
}) {
  const inputSchema = detail.requestSchema?.properties?.input;

  if (
    inputSchema &&
    typeof inputSchema === "object" &&
    inputSchema.type === "object" &&
    inputSchema.properties
  ) {
    return true;
  }

  return Boolean(
    detail.examplePayload?.input &&
      typeof detail.examplePayload.input === "object" &&
      !Array.isArray(detail.examplePayload.input),
  );
}

function isCallbackField(key: string) {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]+/g, "");

  return (
    normalized === "callback" ||
    normalized === "callbackurl" ||
    normalized === "progresscallbackurl" ||
    normalized === "webhookurl"
  );
}

export function buildAiVideoStudioPayload(input: {
  detail: {
    examplePayload?: Record<string, any> | null;
    requestSchema?: Record<string, any> | null;
  };
  formValues: AiVideoStudioFormValues;
  selectedPricing?: AiStudioPublicPricingRow | null;
}) {
  const basePayload = input.detail.examplePayload ?? {};
  const nextPayload =
    (pruneAiVideoStudioFormValues(input.formValues) as Record<string, unknown> | undefined) ??
    {};

  const payload = (
    usesInputEnvelope(input.detail)
      ? {
          ...(typeof basePayload.model === "string" ? { model: basePayload.model } : {}),
          input: nextPayload,
        }
      : {
          ...(typeof basePayload.model === "string" ? { model: basePayload.model } : {}),
          ...nextPayload,
        }
  ) as Record<string, any>;

  if (input.selectedPricing) {
    return applyPricingRowToPayload(payload, input.selectedPricing);
  }

  return payload;
}

export function restoreAiVideoStudioFormState(input: {
  familyKey: AiVideoStudioFamilyKey;
  versionKey: AiVideoStudioVersionKey;
  isPublic: boolean;
  payload: Record<string, any> | null | undefined;
}): AiVideoStudioStoredState {
  const payload =
    input.payload && typeof input.payload === "object"
      ? structuredClone(input.payload)
      : {};
  const formValues =
    payload.input && typeof payload.input === "object"
      ? { ...(payload.input as Record<string, unknown>) }
      : Object.fromEntries(
          Object.entries(payload).filter(
            ([key]) => key !== "model" && !isCallbackField(key),
          ),
        );

  return {
    familyKey: input.familyKey,
    versionKey: input.versionKey,
    isPublic: input.isPublic,
    formValues,
  };
}

export function serializeAiVideoStudioStoredState(
  state: AiVideoStudioStoredState,
) {
  return JSON.stringify(state);
}

export function safeParseAiVideoStudioStoredState(
  raw: string | null,
): AiVideoStudioStoredState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AiVideoStudioStoredState>;
    const familyExists =
      typeof parsed.familyKey === "string" &&
      AI_VIDEO_STUDIO_FAMILIES.some((family) => family.key === parsed.familyKey);
    const versionExists =
      familyExists &&
      typeof parsed.versionKey === "string" &&
      getAiVideoStudioVersions(parsed.familyKey as string).some(
        (version) => version.key === parsed.versionKey,
      );

    if (
      !familyExists ||
      !versionExists ||
      typeof parsed.isPublic !== "boolean" ||
      !parsed.formValues ||
      typeof parsed.formValues !== "object"
    ) {
      return null;
    }

    return {
      familyKey: parsed.familyKey as string,
      versionKey: parsed.versionKey as string,
      isPublic: parsed.isPublic,
      formValues: parsed.formValues as AiVideoStudioFormValues,
    };
  } catch {
    return null;
  }
}
