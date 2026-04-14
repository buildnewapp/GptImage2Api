type SeedanceModelId =
  | "video:seedance-2-0"
  | "video:apimart-seedance-2-0"
  | "video:seedance-2-0-vip"
  | "video:seedance-2-0-fast"
  | "video:apimart-seedance-2-0-fast"
  | "video:seedance-2-0-fast-vip";

type SeedanceResolution = "480p" | "720p";
type SeedanceTier = "standard" | "fast";

export const LOCAL_REFERENCE_METADATA_KEY = "__local_reference_metadata";

type SeedancePricingResult = {
  modelDescription: string;
  creditPrice: string;
  usdPrice: string;
  billableSeconds: number;
  rate: number;
  hasVideoInput: boolean;
  outputDurationSeconds: number;
  inputVideoDurationSeconds: number;
};

const CREDIT_RATES: Record<
  SeedanceTier,
  Record<SeedanceResolution, { noVideo: number; withVideo: number }>
> = {
  standard: {
    "480p": { noVideo: 19, withVideo: 11.5 },
    "720p": { noVideo: 41, withVideo: 25 },
  },
  fast: {
    "480p": { noVideo: 15.5, withVideo: 9 },
    "720p": { noVideo: 33, withVideo: 20 },
  },
};

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function ceilPositiveNumber(value: number | null) {
  if (value === null) {
    return null;
  }

  return Math.ceil(value);
}

function findFirstPositiveNumber(value: unknown): number | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = findFirstPositiveNumber(item);
      if (parsed !== null) {
        return parsed;
      }
    }

    return null;
  }

  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const parsed = findFirstPositiveNumber(nested);
      if (parsed !== null) {
        return parsed;
      }
    }

    return null;
  }

  return parsePositiveNumber(value);
}

function getNested(record: Record<string, any>, path: string[]) {
  let current: unknown = record;

  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function getLocalReferenceMetadata(payload: Record<string, any>) {
  const rootMetadata = payload[LOCAL_REFERENCE_METADATA_KEY];
  if (rootMetadata && typeof rootMetadata === "object" && !Array.isArray(rootMetadata)) {
    return rootMetadata as Record<string, unknown>;
  }

  const nestedMetadata = getNested(payload, ["input", LOCAL_REFERENCE_METADATA_KEY]);
  if (nestedMetadata && typeof nestedMetadata === "object" && !Array.isArray(nestedMetadata)) {
    return nestedMetadata as Record<string, unknown>;
  }

  return null;
}

function parseOutputDuration(payload: Record<string, any>) {
  const candidates = [
    payload.duration,
    getNested(payload, ["input", "duration"]),
    payload.n_frames,
    getNested(payload, ["input", "n_frames"]),
  ];

  for (const candidate of candidates) {
    const parsed = parsePositiveNumber(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function normalizeResolution(value: unknown): SeedanceResolution | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "480p" || normalized === "720p") {
    return normalized;
  }

  return null;
}

function parseResolution(payload: Record<string, any>) {
  return (
    normalizeResolution(payload.resolution) ??
    normalizeResolution(getNested(payload, ["input", "resolution"])) ??
    null
  );
}

function collectReferencedVideoUrls(payload: Record<string, any>) {
  return [
    ...(Array.isArray(payload.video_urls) ? payload.video_urls : []),
    ...(Array.isArray(getNested(payload, ["input", "video_urls"]))
      ? (getNested(payload, ["input", "video_urls"]) as unknown[])
      : []),
    ...(Array.isArray(payload.reference_video_urls) ? payload.reference_video_urls : []),
    ...(Array.isArray(getNested(payload, ["input", "reference_video_urls"]))
      ? (getNested(payload, ["input", "reference_video_urls"]) as unknown[])
      : []),
    ...(Array.isArray(payload["reference_video_urls "]) ? payload["reference_video_urls "] : []),
    ...(Array.isArray(getNested(payload, ["input", "reference_video_urls "]))
      ? (getNested(payload, ["input", "reference_video_urls "]) as unknown[])
      : []),
    payload.video_url,
    getNested(payload, ["input", "video_url"]),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
}

function hasVideoReference(payload: Record<string, any>) {
  const candidates = [
    payload.video_urls,
    getNested(payload, ["input", "video_urls"]),
    payload.reference_video_urls,
    getNested(payload, ["input", "reference_video_urls"]),
    payload["reference_video_urls "],
    getNested(payload, ["input", "reference_video_urls "]),
    payload.video_url,
    getNested(payload, ["input", "video_url"]),
    payload.video_input,
    getNested(payload, ["input", "video_input"]),
  ];

  return candidates.some((candidate) => {
    if (Array.isArray(candidate)) {
      return candidate.length > 0;
    }

    return Boolean(candidate);
  });
}

function parseInputVideoDuration(payload: Record<string, any>) {
  const candidates = [
    payload.video_duration,
    getNested(payload, ["input", "video_duration"]),
    payload.video_durations,
    getNested(payload, ["input", "video_durations"]),
    payload.video_input,
    getNested(payload, ["input", "video_input"]),
  ];

  for (const candidate of candidates) {
    const parsed = ceilPositiveNumber(findFirstPositiveNumber(candidate));
    if (parsed !== null) {
      return parsed;
    }
  }

  const metadata = getLocalReferenceMetadata(payload);
  const durationsByUrl =
    metadata?.videoDurationsByUrl &&
    typeof metadata.videoDurationsByUrl === "object" &&
    !Array.isArray(metadata.videoDurationsByUrl)
      ? (metadata.videoDurationsByUrl as Record<string, unknown>)
      : null;

  if (!durationsByUrl) {
    return null;
  }

  const referencedUrls = collectReferencedVideoUrls(payload);

  if (referencedUrls.length === 0) {
    return null;
  }

  const resolvedDurations = referencedUrls
    .map((url) => ceilPositiveNumber(parsePositiveNumber(durationsByUrl[url])))
    .filter((value): value is number => value !== null);

  if (resolvedDurations.length === 0) {
    return null;
  }

  return resolvedDurations.reduce((sum, value) => sum + value, 0);
}

function getSeedanceTier(model: string): SeedanceTier | null {
  if (
    model === "video:seedance-2-0" ||
    model === "video:apimart-seedance-2-0" ||
    model === "video:seedance-2-0-vip"
  ) {
    return "standard";
  }

  if (
    model === "video:seedance-2-0-fast" ||
    model === "video:apimart-seedance-2-0-fast" ||
    model === "video:seedance-2-0-fast-vip"
  ) {
    return "fast";
  }

  return null;
}

function formatCreditPrice(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(3).replace(/\.?0+$/, "");
}

function getModelLabel(model: string, tier: SeedanceTier) {
  if (model === "video:seedance-2-0-vip") {
    return "Seedance 2.0 VIP";
  }

  if (model === "video:seedance-2-0-fast-vip") {
    return "Seedance 2.0 Fast VIP";
  }

  return tier === "fast" ? "Seedance 2.0 Fast" : "Seedance 2.0";
}

export function calculateSeedanceVideoPricing(input: {
  model: string;
  payload: Record<string, any>;
}): SeedancePricingResult | null {
  const tier = getSeedanceTier(input.model);
  if (!tier) {
    return null;
  }

  const resolution = parseResolution(input.payload);
  const outputDuration = parseOutputDuration(input.payload);

  if (!resolution || outputDuration === null) {
    return null;
  }

  const inputVideoDuration = parseInputVideoDuration(input.payload);
  const hasVideoInput =
    inputVideoDuration !== null ||
    hasVideoReference(input.payload);

  const rateKey = hasVideoInput ? "withVideo" : "noVideo";
  const creditRate = CREDIT_RATES[tier][resolution][rateKey];
  const billableSeconds = hasVideoInput
    ? outputDuration + (inputVideoDuration ?? 0)
    : outputDuration;
  const credits = billableSeconds * creditRate;
  const modelLabel = getModelLabel(input.model, tier);

  return {
    modelDescription: hasVideoInput
      ? inputVideoDuration !== null
        ? `${modelLabel}, video-to-video, ${resolution}, input ${inputVideoDuration}s + output ${outputDuration}s`
        : `${modelLabel}, video-to-video, ${resolution}, output ${outputDuration}s`
      : `${modelLabel}, text/image-to-video, ${resolution}, ${outputDuration}s`,
    creditPrice: formatCreditPrice(credits),
    usdPrice: "",
    billableSeconds,
    rate: creditRate,
    hasVideoInput,
    outputDurationSeconds: outputDuration,
    inputVideoDurationSeconds: inputVideoDuration ?? 0,
  };
}

export function getSeedancePricingExplanation(input: {
  model: string;
  payload: Record<string, any>;
}): SeedancePricingResult | null {
  const pricing = calculateSeedanceVideoPricing(input);

  if (!pricing) {
    return null;
  }

  if (pricing.hasVideoInput) {
    if (pricing.inputVideoDurationSeconds <= 0) {
      return null;
    }
  }

  return pricing;
}

export function stripLocalReferenceMetadata(payload: Record<string, any>) {
  const next = structuredClone(payload);

  delete next[LOCAL_REFERENCE_METADATA_KEY];

  if (
    next.input &&
    typeof next.input === "object" &&
    !Array.isArray(next.input)
  ) {
    delete next.input[LOCAL_REFERENCE_METADATA_KEY];
  }

  return next;
}

export function buildSeedanceDynamicPricingFields(
  model: string,
  payload: Record<string, any>,
) {
  const dynamicPricing = calculateSeedanceVideoPricing({
    model,
    payload,
  });

  if (!dynamicPricing) {
    return null;
  }

  return {
    modelDescription: dynamicPricing.modelDescription,
    interfaceType: "video",
    provider: "ByteDance",
    creditPrice: dynamicPricing.creditPrice,
    creditUnit: "per video",
    usdPrice: dynamicPricing.usdPrice,
  };
}
