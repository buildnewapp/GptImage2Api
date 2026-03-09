import {
  applyPricingRowToPayload,
} from "@/lib/ai-studio/runtime";
import type { AiStudioPublicPricingRow } from "@/lib/ai-studio/public";
import type {
  AiVideoStudioFamilyKey,
  AiVideoStudioMode,
  AiVideoStudioVersionKey,
} from "@/config/ai-video-studio";

export const AI_VIDEO_STUDIO_FORM_STORAGE_KEY = "ai-video-studio-form";

export type AiVideoStudioFormValues = Record<string, unknown>;

export type AiVideoStudioStoredState = {
  mode: AiVideoStudioMode;
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

export function buildAiVideoStudioPayload(input: {
  detail: {
    examplePayload?: Record<string, any> | null;
  };
  formValues: AiVideoStudioFormValues;
  selectedPricing?: AiStudioPublicPricingRow | null;
}) {
  const basePayload = input.detail.examplePayload ?? {};
  const nextInput = {} as Record<string, unknown>;

  for (const [key, value] of Object.entries(input.formValues)) {
    if (shouldOmitValue(value)) {
      continue;
    }

    nextInput[key] = value;
  }

  const payload = {
    ...(typeof basePayload.model === "string" ? { model: basePayload.model } : {}),
    input: nextInput,
  } as Record<string, any>;

  if (input.selectedPricing) {
    return applyPricingRowToPayload(payload, input.selectedPricing);
  }

  return payload;
}

export function restoreAiVideoStudioFormState(input: {
  mode: AiVideoStudioMode;
  familyKey: AiVideoStudioFamilyKey;
  versionKey: AiVideoStudioVersionKey;
  isPublic: boolean;
  payload: Record<string, any> | null | undefined;
}): AiVideoStudioStoredState {
  return {
    mode: input.mode,
    familyKey: input.familyKey,
    versionKey: input.versionKey,
    isPublic: input.isPublic,
    formValues:
      input.payload?.input && typeof input.payload.input === "object"
        ? { ...input.payload.input }
        : {},
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
    if (
      (parsed.mode !== "text-to-video" && parsed.mode !== "image-to-video") ||
      parsed.familyKey !== "sora2" ||
      (parsed.versionKey !== "sora-2" && parsed.versionKey !== "sora-2-pro") ||
      typeof parsed.isPublic !== "boolean" ||
      !parsed.formValues ||
      typeof parsed.formValues !== "object"
    ) {
      return null;
    }

    return {
      mode: parsed.mode,
      familyKey: parsed.familyKey,
      versionKey: parsed.versionKey,
      isPublic: parsed.isPublic,
      formValues: parsed.formValues as AiVideoStudioFormValues,
    };
  } catch {
    return null;
  }
}
