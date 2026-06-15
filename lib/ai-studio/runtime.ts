import { LOCAL_REFERENCE_METADATA_KEY } from "@/lib/ai-studio/seedance-pricing";

export type AiStudioDynamicPricingConfig = {
  docUrl?: string;
  price_txt?: string;
  billing_adapter?: AiStudioBillingAdapter | string;
  price_key?: string;
  price_map?: Record<string, number>;
  price_final?: string;
  notes?: string;
};

export const AI_STUDIO_BILLING_ADAPTERS = [
  "kie_seedance_2",
] as const;

export type AiStudioBillingAdapter = (typeof AI_STUDIO_BILLING_ADAPTERS)[number];

export function isAiStudioBillingAdapter(value: string): value is AiStudioBillingAdapter {
  return (AI_STUDIO_BILLING_ADAPTERS as readonly string[]).includes(value);
}

function getLocalReferenceMetadata(payload: Record<string, any>) {
  const metadata = payload[LOCAL_REFERENCE_METADATA_KEY];
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }

  const nested = payload.input?.[LOCAL_REFERENCE_METADATA_KEY];
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }

  return null;
}

type CommonPricingRow = {
  modelDescription: string;
  interfaceType: string;
  provider: string;
  creditPrice: string;
  creditUnit: string;
};

export type AiStudioResolvedPricing = CommonPricingRow & {
  pricingKey: string;
  catalogModelId: string;
};

function formatCreditPrice(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(3).replace(/\.?0+$/, "");
}

function hasNonEmptyBillingValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return Boolean(value);
}

function getNestedValue(record: Record<string, any>, path: string[]) {
  let current: unknown = record;

  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function findPositiveScalarNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function parseDurationSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "auto") {
    return null;
  }

  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*s?$/);
  if (!match?.[1]) {
    return null;
  }

  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function collectBillingReferenceUrls(payload: Record<string, any>) {
  return [
    ...(Array.isArray(payload.video_urls) ? payload.video_urls : []),
    ...(Array.isArray(getNestedValue(payload, ["input", "video_urls"]))
      ? (getNestedValue(payload, ["input", "video_urls"]) as unknown[])
      : []),
    ...(Array.isArray(payload.reference_video_urls) ? payload.reference_video_urls : []),
    ...(Array.isArray(getNestedValue(payload, ["input", "reference_video_urls"]))
      ? (getNestedValue(payload, ["input", "reference_video_urls"]) as unknown[])
      : []),
    ...(Array.isArray(payload["reference_video_urls "]) ? payload["reference_video_urls "] : []),
    ...(Array.isArray(getNestedValue(payload, ["input", "reference_video_urls "]))
      ? (getNestedValue(payload, ["input", "reference_video_urls "]) as unknown[])
      : []),
    payload.video_url,
    getNestedValue(payload, ["input", "video_url"]),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
}

function buildKieSeedance2Billing(payload: Record<string, any>) {
  const videoInputCandidates = [
    payload.video_urls,
    getNestedValue(payload, ["input", "video_urls"]),
    payload.reference_video_urls,
    getNestedValue(payload, ["input", "reference_video_urls"]),
    payload["reference_video_urls "],
    getNestedValue(payload, ["input", "reference_video_urls "]),
    payload.video_url,
    getNestedValue(payload, ["input", "video_url"]),
    payload.video_input,
    getNestedValue(payload, ["input", "video_input"]),
  ];
  const hasVideoInput = videoInputCandidates.some(hasNonEmptyBillingValue);

  const directDuration = [
    payload.video_duration,
    getNestedValue(payload, ["input", "video_duration"]),
  ]
    .map(findPositiveScalarNumber)
    .find((value): value is number => value !== null);

  if (directDuration !== undefined) {
    return {
      has_video_input: hasVideoInput,
      input_video_duration: Math.ceil(directDuration),
    };
  }

  const metadata = getLocalReferenceMetadata(payload);
  const durationsByUrl =
    metadata?.videoDurationsByUrl &&
    typeof metadata.videoDurationsByUrl === "object" &&
    !Array.isArray(metadata.videoDurationsByUrl)
      ? (metadata.videoDurationsByUrl as Record<string, unknown>)
      : null;

  if (durationsByUrl) {
    const durations = collectBillingReferenceUrls(payload)
      .map((url) => findPositiveScalarNumber(durationsByUrl[url]))
      .filter((value): value is number => value !== null)
      .map((value) => Math.ceil(value));

    if (durations.length > 0) {
      return {
        has_video_input: hasVideoInput,
        input_video_duration: durations.reduce((sum, value) => sum + value, 0),
      };
    }
  }

  if (hasVideoInput) {
    return null;
  }

  return {
    has_video_input: false,
    input_video_duration: 0,
  };
}

function normalizeImageSizePx(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
    const match = normalized.match(/^(\d+)x(\d+)$/);
    return match ? `${match[1]}x${match[2]}` : null;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const width = Number((value as Record<string, unknown>).width);
    const height = Number((value as Record<string, unknown>).height);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return `${Math.round(width)}x${Math.round(height)}`;
    }
  }

  return null;
}

function normalizePricingValue(value: unknown) {
  return parseDurationSeconds(value) ?? normalizeImageSizePx(value) ?? value;
}

function buildPricingObjectProxy(record: Record<string, unknown>) {
  return new Proxy(record, {
    get(target, property) {
      if (property === Symbol.unscopables) {
        return undefined;
      }

      return normalizePricingValue(Reflect.get(target, property));
    },
  });
}

function buildBillingContext(
  config: AiStudioDynamicPricingConfig,
  payload: Record<string, any>,
) {
  if (config.billing_adapter === "kie_seedance_2") {
    return buildKieSeedance2Billing(payload);
  }

  if (config.billing_adapter) {
    return null;
  }

  return {};
}

function assertSafePricingExpression(expression: string) {
  if (!/^[\w\s.$?:'"|&=!<>+\-*/()%[\],]+$/.test(expression)) {
    throw new Error("Unsupported pricing expression");
  }

  if (/(?:constructor|__proto__|prototype|global|process|require|Function|eval|import)/.test(expression)) {
    throw new Error("Unsupported pricing expression");
  }
}

function buildPricingScope(
  payload: Record<string, any>,
  billing: Record<string, unknown>,
  price?: number,
) {
  const input =
    payload.input && typeof payload.input === "object" && !Array.isArray(payload.input)
      ? buildPricingObjectProxy(payload.input)
      : {};
  const scope = {
    ...payload,
    input,
    billing,
    price,
  };

  return new Proxy(scope, {
    has() {
      return true;
    },
    get(target, property) {
      if (property === Symbol.unscopables) {
        return undefined;
      }
      return normalizePricingValue(Reflect.get(target, property));
    },
  });
}

function evaluatePricingExpression(
  expression: string,
  scope: Record<string, unknown>,
) {
  const normalizedExpression = expression.replace(/\$([a-zA-Z_]\w*)/g, "$1");
  assertSafePricingExpression(normalizedExpression);
  return Function(
    "scope",
    `with (scope) { return (${normalizedExpression}); }`,
  )(scope);
}

function renderPricingTemplate(
  template: string,
  scope: Record<string, unknown>,
) {
  const exact = template.match(/^\{\$([^{}]+)\}$/);
  if (exact?.[1]) {
    return evaluatePricingExpression(exact[1], scope);
  }

  return template.replace(/\{\$([^{}]+)\}/g, (_match, expression: string) => {
    const value = evaluatePricingExpression(expression, scope);
    return value === undefined || value === null ? "" : String(value);
  });
}

function evaluatePriceFinal(template: string, scope: Record<string, unknown>) {
  const rendered = renderPricingTemplate(template, scope);
  if (typeof rendered === "number") {
    return rendered;
  }

  const expression = String(rendered);
  assertSafePricingExpression(expression);
  const value = Function(
    `"use strict"; return (${expression});`,
  )();

  return typeof value === "number" ? value : Number(value);
}

export function resolveDynamicPricing(
  config: AiStudioDynamicPricingConfig | null | undefined,
  payload: Record<string, any>,
  model: {
    modelId: string;
    title: string;
    provider: string;
    category: string;
  },
): AiStudioResolvedPricing | null {
  if (!config?.price_key || !config.price_map || !config.price_final) {
    return null;
  }

  try {
    const billing = buildBillingContext(config, payload);
    if (!billing) {
      return null;
    }

    const keyScope = buildPricingScope(payload, billing);
    const pricingKey = String(renderPricingTemplate(config.price_key, keyScope));
    if (!pricingKey || !(pricingKey in config.price_map)) {
      return null;
    }

    const price = Number(config.price_map[pricingKey]);
    if (!Number.isFinite(price) || price <= 0) {
      return null;
    }

    const finalScope = buildPricingScope(payload, billing, price);
    const finalPrice = evaluatePriceFinal(config.price_final, finalScope);
    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      return null;
    }

    return {
      modelDescription: `${model.title}, ${pricingKey}`,
      interfaceType: model.category,
      provider: model.provider,
      creditPrice: formatCreditPrice(finalPrice),
      creditUnit: "credits",
      pricingKey,
      catalogModelId: model.modelId,
    };
  } catch {
    return null;
  }
}

export function resolveSelectedPricing(
  input: {
    modelId: string;
    payload: Record<string, any>;
    pricing?: AiStudioDynamicPricingConfig | null;
    title?: string;
    provider?: string;
    category?: string;
  },
) {
  return resolveDynamicPricing(input.pricing, input.payload, {
    modelId: input.modelId,
    title: input.title ?? input.modelId,
    provider: input.provider ?? "",
    category: input.category ?? "video",
  });
}

export function getDisplayModelLabel(
  config: {
    alias?: string | null;
    modelKeys?: string[];
  },
  modelValue: string | null | undefined,
) {
  if (!modelValue) {
    return "";
  }

  if (
    config.alias &&
    Array.isArray(config.modelKeys) &&
    config.modelKeys.length === 1 &&
    config.modelKeys[0] === modelValue
  ) {
    return config.alias;
  }

  return modelValue;
}

export function resolvePublicModelId(
  selectedId: string | null | undefined,
  detail: Pick<{ id: string }, "id"> | null | undefined,
) {
  if (detail?.id) {
    return detail.id;
  }

  return selectedId ?? "";
}

export function toBillableCredits(creditPrice: string | number | null | undefined) {
  const amount =
    typeof creditPrice === "number"
      ? creditPrice
      : Number.parseFloat(creditPrice ?? "0");

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  // Existing usage balances are integer credits, so fractional official prices
  // are reserved using a conservative round-up.
  return Math.ceil(amount);
}

export function getEstimatedCreditsForPricing(
  pricingRow:
    | Pick<CommonPricingRow, "creditPrice" | "creditUnit">
    | null
    | undefined,
) {
  if (!pricingRow) {
    return 0;
  }

  return toBillableCredits(pricingRow.creditPrice);
}
