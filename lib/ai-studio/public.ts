import {
  AiStudioCatalogEntry,
  AiStudioDocDetail,
  getAiStudioPublicModelId,
} from "@/lib/ai-studio/catalog";
import {
  type AiStudioRequestMeta,
  type AiStudioTaskMeta,
  getAiStudioRequestMeta,
  getAiStudioTaskMeta,
  isAiStudioCallbackField,
} from "@/lib/ai-studio/provider-metadata";

export type AiStudioPublicCatalogEntry = Omit<
  AiStudioCatalogEntry,
  "docUrl" | "vendor"
>;
export type AiStudioPublicDocDetail = Omit<
  AiStudioDocDetail,
  "docUrl" | "vendor"
> & {
  requestMeta: AiStudioRequestMeta;
  taskMeta: AiStudioTaskMeta;
};

function isCallbackKey(input: string) {
  return isAiStudioCallbackField(input);
}

function sanitizeBrandString(input: string) {
  const output = input
    .replace(/https?:\/\/docs\.kie\.ai[^\s)"']*/gi, "AI Studio docs")
    .replace(/https?:\/\/api\.kie\.ai[^\s)"']*/gi, "AI Studio API")
    .replace(/\bkie\.ai\b/gi, "AI Studio")
    .replace(/\bkie ai\b/gi, "AI Studio")
    .replace(/\bkie\b/gi, "AI Studio");

  return output.replace(/\s{2,}/g, " ").trim();
}

function sanitizeValue(
  value: unknown,
  options: {
    stripCallbackFields: boolean;
  },
): unknown {
  if (typeof value === "string") {
    return sanitizeBrandString(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item, options))
      .filter((item) => item !== undefined);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === "docUrl") {
      continue;
    }

    if (options.stripCallbackFields && isCallbackKey(key)) {
      continue;
    }

    if (
      options.stripCallbackFields &&
      (key === "x-apidog-orders" || key === "required") &&
      Array.isArray(child)
    ) {
      next[key] = child.filter(
        (item) => typeof item !== "string" || !isCallbackKey(item),
      );
      continue;
    }

    const sanitized = sanitizeValue(child, options);
    if (sanitized !== undefined) {
      next[key] = sanitized;
    }
  }

  return next;
}

export function sanitizeAiStudioDebugValue(value: unknown) {
  return sanitizeValue(value, { stripCallbackFields: false });
}

export const getPublicAiStudioModelId = getAiStudioPublicModelId;

function getPublicModelAlias(
  entry: Pick<AiStudioCatalogEntry, "alias"> & {
    modelKeys?: string[];
  },
  modelValue: string | null | undefined,
) {
  if (
    entry.alias &&
    typeof modelValue === "string" &&
    Array.isArray(entry.modelKeys) &&
    entry.modelKeys.length === 1 &&
    entry.modelKeys[0] === modelValue
  ) {
    return entry.alias;
  }

  return modelValue ?? null;
}

function rewritePublicModelFields(
  entry: Pick<AiStudioCatalogEntry, "alias"> & {
    modelKeys?: string[];
  },
  detail: {
    modelKeys: string[];
    requestSchema: Record<string, any> | null;
    examplePayload: Record<string, any>;
  },
) {
  const publicModelKeys = detail.modelKeys.map((modelKey) =>
    getPublicModelAlias(entry, modelKey) ?? modelKey,
  );

  const modelSchema = detail.requestSchema?.properties?.model;
  if (modelSchema && typeof modelSchema === "object") {
    if (Array.isArray(modelSchema.enum)) {
      modelSchema.enum = modelSchema.enum.map((value: unknown) =>
        typeof value === "string" ? getPublicModelAlias(entry, value) ?? value : value,
      );
    }

    if (typeof modelSchema.default === "string") {
      modelSchema.default =
        getPublicModelAlias(entry, modelSchema.default) ?? modelSchema.default;
    }

    if (Array.isArray(modelSchema.examples)) {
      modelSchema.examples = modelSchema.examples.map((value: unknown) =>
        typeof value === "string" ? getPublicModelAlias(entry, value) ?? value : value,
      );
    }

    if (typeof modelSchema.description === "string" && publicModelKeys.length === 1) {
      modelSchema.description = modelSchema.description.replace(
        /`[^`]+`/g,
        `\`${publicModelKeys[0]}\``,
      );
    }
  }

  if (typeof detail.examplePayload.model === "string") {
    detail.examplePayload.model =
      getPublicModelAlias(entry, detail.examplePayload.model) ??
      detail.examplePayload.model;
  }

  detail.modelKeys = publicModelKeys;
}

export function toPublicCatalogEntry(entry: AiStudioCatalogEntry): AiStudioPublicCatalogEntry {
  const { docUrl: _docUrl, ...rest } = entry;
  return {
    ...rest,
    id: getPublicAiStudioModelId(entry),
  };
}

export function toPublicDocDetail(detail: AiStudioDocDetail): AiStudioPublicDocDetail {
  const {
    docUrl: _docUrl,
    pricing,
    requestSchema,
    examplePayload,
    vendor: _vendor,
    ...rest
  } = detail;
  const next = {
    ...rest,
    modelKeys: [...detail.modelKeys],
    requestSchema: sanitizeValue(requestSchema, {
      stripCallbackFields: true,
    }) as AiStudioDocDetail["requestSchema"],
    examplePayload: sanitizeValue(examplePayload, {
      stripCallbackFields: true,
    }) as AiStudioDocDetail["examplePayload"],
    ...(pricing
      ? {
          pricing: sanitizeValue(pricing, {
            stripCallbackFields: false,
          }) as AiStudioDocDetail["pricing"],
        }
      : {}),
    requestMeta: getAiStudioRequestMeta(detail),
    taskMeta: getAiStudioTaskMeta(detail),
  };

  rewritePublicModelFields(detail, next);

  return {
    ...next,
    id: getPublicAiStudioModelId(detail),
  };
}
