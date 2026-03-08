import {
  AiStudioCatalogEntry,
  AiStudioDocDetail,
  AiStudioPricingRow,
  extractPricingAnchorModel,
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

export function toPublicPricingRow(row: AiStudioPricingRow): AiStudioPublicPricingRow {
  const { anchor: _anchor, ...rest } = row;
  return {
    ...(sanitizeValue(rest, {
      stripCallbackFields: false,
    }) as Omit<AiStudioPublicPricingRow, "runtimeModel">),
    runtimeModel: extractPricingAnchorModel(row.anchor) || null,
  };
}

export function toPublicCatalogEntry(entry: AiStudioCatalogEntry): AiStudioPublicCatalogEntry {
  const { docUrl: _docUrl, pricingRows, ...rest } = entry;
  return {
    ...rest,
    pricingRows: pricingRows.map(toPublicPricingRow),
  };
}

export function toPublicDocDetail(detail: AiStudioDocDetail): AiStudioPublicDocDetail {
  const { docUrl: _docUrl, pricingRows, requestSchema, examplePayload, ...rest } = detail;
  return {
    ...rest,
    requestSchema: sanitizeValue(requestSchema, {
      stripCallbackFields: true,
    }) as AiStudioDocDetail["requestSchema"],
    examplePayload: sanitizeValue(examplePayload, {
      stripCallbackFields: true,
    }) as AiStudioDocDetail["examplePayload"],
    pricingRows: pricingRows.map(toPublicPricingRow),
  };
}
