import type { AiStudioPublicPricingRow } from "@/lib/ai-studio/public";
import {
  buildSeedanceDynamicPricingFields,
  LOCAL_REFERENCE_METADATA_KEY,
} from "@/lib/ai-studio/seedance-pricing";

export function collectRuntimeModels(pricingRows: AiStudioPublicPricingRow[]) {
  const models = new Set<string>();

  for (const row of pricingRows) {
    if (row.runtimeModel) {
      models.add(row.runtimeModel);
    }
  }

  return [...models];
}

export function applyPricingRowToPayload(
  payload: Record<string, any>,
  pricingRow: Pick<AiStudioPublicPricingRow, "runtimeModel" | "modelDescription">,
) {
  const next = structuredClone(payload);

  if (pricingRow.runtimeModel) {
    next.model = pricingRow.runtimeModel;
  }

  const durationMatch = pricingRow.modelDescription.match(/(\d+(?:\.\d+)?)s/i);
  const duration =
    durationMatch?.[1] ? Math.round(Number.parseFloat(durationMatch[1])) : null;

  if (duration) {
    if (typeof next.duration === "number") {
      next.duration = duration;
    } else if (typeof next.duration === "string") {
      next.duration = String(duration);
    }

    if (next.input && typeof next.input === "object") {
      if (typeof next.input.n_frames === "string") {
        next.input.n_frames = String(duration);
      } else if (typeof next.input.n_frames === "number") {
        next.input.n_frames = duration;
      }
    }
  }

  return next;
}

type PricingSelectionRow = {
  modelDescription: string;
  runtimeModel?: string | null;
};

function normalizeRuntimeModel(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseDurationHint(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }

  return null;
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

function collectReferenceUrls(payload: Record<string, any>, keys: string[]) {
  const values: string[] = [];

  for (const key of keys) {
    const direct = payload[key];
    const nested = payload.input?.[key];

    for (const candidate of [direct, nested]) {
      if (typeof candidate === "string" && candidate.length > 0) {
        values.push(candidate);
        continue;
      }

      if (Array.isArray(candidate)) {
        values.push(
          ...candidate.filter(
            (item): item is string => typeof item === "string" && item.length > 0,
          ),
        );
      }
    }
  }

  return values;
}

function extractDurationFromReferenceMetadata(
  payload: Record<string, any>,
  input: {
    metadataKey: "videoDurationsByUrl" | "audioDurationsByUrl";
    payloadKeys: string[];
  },
) {
  const metadata = getLocalReferenceMetadata(payload);
  const durationsByUrl =
    metadata?.[input.metadataKey] &&
    typeof metadata[input.metadataKey] === "object" &&
    !Array.isArray(metadata[input.metadataKey])
      ? (metadata[input.metadataKey] as Record<string, unknown>)
      : null;

  if (!durationsByUrl) {
    return null;
  }

  const durations = collectReferenceUrls(payload, input.payloadKeys)
    .map((url) => parseDurationHint(durationsByUrl[url]))
    .filter((value): value is number => value !== null);

  if (durations.length === 0) {
    return null;
  }

  return durations.reduce((sum, value) => sum + value, 0);
}

function extractDurationHint(payload: Record<string, any>) {
  return (
    parseDurationHint(payload.duration) ??
    parseDurationHint(payload.input?.duration) ??
    parseDurationHint(payload.input?.extend_times) ??
    parseDurationHint(payload.video_duration) ??
    parseDurationHint(payload.input?.video_duration) ??
    parseDurationHint(payload.audio_duration) ??
    parseDurationHint(payload.input?.audio_duration) ??
    parseDurationHint(payload.input?.n_frames) ??
    extractDurationFromReferenceMetadata(payload, {
      metadataKey: "videoDurationsByUrl",
      payloadKeys: ["video_url", "video_urls", "reference_video_urls", "video_input"],
    }) ??
    extractDurationFromReferenceMetadata(payload, {
      metadataKey: "audioDurationsByUrl",
      payloadKeys: ["audio_url", "audio_urls"],
    }) ??
    null
  );
}

function extractResolutionHint(payload: Record<string, any>) {
  const values = [
    payload.resolution,
    payload.input?.resolution,
    payload.input?.image_resolution,
    payload.mode,
    payload.input?.mode,
  ];

  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().toLowerCase();
    }
  }

  return null;
}

function parseAudioHint(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "with-audio", "with audio"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "without-audio", "without audio"].includes(normalized)) {
    return false;
  }

  return null;
}

function extractAudioHint(payload: Record<string, any>) {
  return (
    parseAudioHint(payload.sound) ??
    parseAudioHint(payload.input?.sound) ??
    parseAudioHint(payload.audio) ??
    parseAudioHint(payload.input?.audio) ??
    parseAudioHint(payload.with_audio) ??
    parseAudioHint(payload.input?.with_audio) ??
    parseAudioHint(payload.generate_audio) ??
    parseAudioHint(payload.input?.generate_audio) ??
    null
  );
}

function extractDescriptionDuration(description: string) {
  const match = description.match(/(\d+(?:\.\d+)?)s/i);
  return match?.[1] ? Math.round(Number.parseFloat(match[1])) : null;
}

function extractDescriptionResolution(description: string) {
  const match = description.match(/\b(\d{3,4}p|[1248]k)\b/i);
  return match?.[1] ? match[1].toLowerCase() : null;
}

function extractDescriptionAudio(description: string) {
  if (/without audio/i.test(description)) {
    return false;
  }

  if (/with audio/i.test(description)) {
    return true;
  }

  return null;
}

export function guessPricingRow<Row extends PricingSelectionRow>(
  pricingRows: Row[],
  payload: Record<string, any>,
) {
  if (pricingRows.length <= 1) {
    return pricingRows[0] ?? null;
  }

  const payloadModel =
    typeof payload.model === "string" ? normalizeRuntimeModel(payload.model) : "";
  const durationHint = extractDurationHint(payload);
  const resolutionHint = extractResolutionHint(payload);
  const audioHint = extractAudioHint(payload);
  let bestRow: Row | null = null;
  let bestScore = -1;

  for (const row of pricingRows) {
    let score = 0;
    const runtimeModel = row.runtimeModel ? normalizeRuntimeModel(row.runtimeModel) : "";

    if (payloadModel && runtimeModel) {
      if (runtimeModel === payloadModel) {
        score += 20;
      } else if (runtimeModel.startsWith(`${payloadModel}-`)) {
        score += 10;
      } else {
        score -= 5;
      }
    }

    const rowDuration = extractDescriptionDuration(row.modelDescription);
    if (durationHint !== null && rowDuration !== null) {
      if (rowDuration === durationHint) {
        score += 12;
      } else {
        score -= 6;
      }
    }

    const rowResolution = extractDescriptionResolution(row.modelDescription);
    if (resolutionHint && rowResolution) {
      if (rowResolution === resolutionHint) {
        score += 8;
      } else {
        score -= 4;
      }
    }

    const rowAudio = extractDescriptionAudio(row.modelDescription);
    if (audioHint !== null && rowAudio !== null) {
      if (rowAudio === audioHint) {
        score += 10;
      } else {
        score -= 5;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestRow = row;
    }
  }

  return bestRow;
}

type CommonPricingRow = {
  modelDescription: string;
  interfaceType: string;
  provider: string;
  creditPrice: string;
  creditUnit: string;
  usdPrice: string;
  falPrice: string;
  discountRate: number;
  discountPrice: boolean;
};

export function resolveSelectedPricing<Row extends PricingSelectionRow & Partial<CommonPricingRow>>(
  pricingRows: Row[],
  input: {
    modelId: string;
    payload: Record<string, any>;
  },
) {
  const estimated = guessPricingRow(pricingRows, input.payload);
  const dynamicFields = buildSeedanceDynamicPricingFields(
    input.modelId,
    input.payload,
  );

  if (!dynamicFields) {
    return estimated;
  }

  return {
    ...estimated,
    ...dynamicFields,
    creditUnit: dynamicFields.creditUnit ?? estimated?.creditUnit ?? "per video",
    falPrice: estimated?.falPrice ?? "",
    discountRate: estimated?.discountRate ?? 0,
    discountPrice: estimated?.discountPrice ?? false,
  } as Row & CommonPricingRow;
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
  payload: Record<string, any> | null | undefined,
) {
  if (!pricingRow) {
    return 0;
  }

  const rate = Number.parseFloat(pricingRow.creditPrice ?? "0");
  if (!Number.isFinite(rate) || rate <= 0) {
    return 0;
  }

  const creditUnit = pricingRow.creditUnit.trim().toLowerCase();
  if (creditUnit.includes("per second")) {
    const durationHint =
      payload && typeof payload === "object" ? extractDurationHint(payload) : null;

    if (durationHint !== null) {
      return toBillableCredits(rate * durationHint);
    }
  }

  return toBillableCredits(rate);
}
