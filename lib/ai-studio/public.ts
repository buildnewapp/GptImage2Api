import {
  AiStudioCatalogEntry,
  AiStudioDocDetail,
  AiStudioPricingRow,
  getAiStudioPublicModelId,
  resolvePricingRowRuntimeModel,
} from "@/lib/ai-studio/catalog";

export type AiStudioPublicPricingRow = Omit<AiStudioPricingRow, "anchor"> & {
  runtimeModel: string | null;
};
export type AiStudioPublicCatalogEntry = Omit<AiStudioCatalogEntry, "docUrl" | "pricingRows"> & {
  pricingRows: AiStudioPublicPricingRow[];
};
export type AiStudioPublicDocDetail = Omit<AiStudioDocDetail, "docUrl" | "pricingRows"> & {
  pricingRows: AiStudioPublicPricingRow[];
};

const CALLBACK_KEYS = new Set([
  "callbackurl",
  "callback_url",
  "progresscallbackurl",
  "progress_callback_url",
  "webhookurl",
  "webhook_url",
]);

function normalizeKey(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isCallbackKey(input: string) {
  return CALLBACK_KEYS.has(normalizeKey(input));
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
    if (key === "docUrl" || key === "anchor") {
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

export function toPublicPricingRow(
  row: AiStudioPricingRow,
  entry: Pick<AiStudioCatalogEntry, "category" | "title" | "provider" | "docUrl" | "alias"> & {
    modelKeys?: string[];
  },
): AiStudioPublicPricingRow {
  const { anchor: _anchor, ...rest } = row;
  const runtimeModel = resolvePricingRowRuntimeModel(entry, row);
  return {
    ...(sanitizeValue(rest, {
      stripCallbackFields: false,
    }) as Omit<AiStudioPublicPricingRow, "runtimeModel">),
    runtimeModel: getPublicModelAlias(entry, runtimeModel),
  };
}

export function toPublicCatalogEntry(entry: AiStudioCatalogEntry): AiStudioPublicCatalogEntry {
  const { docUrl: _docUrl, pricingRows, ...rest } = entry;
  const runtimeModels = [
    ...new Set(
      pricingRows
        .map((row) => resolvePricingRowRuntimeModel(entry, row))
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  ];
  const publicEntry =
    runtimeModels.length === 1
      ? {
          ...entry,
          modelKeys: runtimeModels,
        }
      : entry;

  return {
    ...rest,
    id: getPublicAiStudioModelId(entry),
    pricingRows: pricingRows.map((row) => toPublicPricingRow(row, publicEntry)),
  };
}

export function toPublicDocDetail(detail: AiStudioDocDetail): AiStudioPublicDocDetail {
  const { docUrl: _docUrl, pricingRows, requestSchema, examplePayload, ...rest } = detail;
  const next = {
    ...rest,
    modelKeys: [...detail.modelKeys],
    requestSchema: sanitizeValue(requestSchema, {
      stripCallbackFields: true,
    }) as AiStudioDocDetail["requestSchema"],
    examplePayload: sanitizeValue(examplePayload, {
      stripCallbackFields: true,
    }) as AiStudioDocDetail["examplePayload"],
    pricingRows: pricingRows.map((row) => toPublicPricingRow(row, detail)),
  };

  rewritePublicModelFields(detail, next);

  return {
    ...next,
    id: getPublicAiStudioModelId(detail),
  };
}
