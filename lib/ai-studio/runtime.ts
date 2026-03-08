import type { AiStudioPublicPricingRow } from "@/lib/ai-studio/public";

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

function extractDurationHint(payload: Record<string, any>) {
  return (
    parseDurationHint(payload.duration) ??
    parseDurationHint(payload.input?.duration) ??
    parseDurationHint(payload.input?.n_frames) ??
    null
  );
}

function extractResolutionHint(payload: Record<string, any>) {
  const values = [
    payload.resolution,
    payload.input?.resolution,
    payload.input?.image_resolution,
  ];

  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().toLowerCase();
    }
  }

  return null;
}

function extractDescriptionDuration(description: string) {
  const match = description.match(/(\d+(?:\.\d+)?)s/i);
  return match?.[1] ? Math.round(Number.parseFloat(match[1])) : null;
}

function extractDescriptionResolution(description: string) {
  const match = description.match(/\b(\d{3,4}p|[1248]k)\b/i);
  return match?.[1] ? match[1].toLowerCase() : null;
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

    if (score > bestScore) {
      bestScore = score;
      bestRow = row;
    }
  }

  return bestRow;
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

export function toBillableCredits(creditPrice: string | null | undefined) {
  const amount = Number.parseFloat(creditPrice ?? "0");

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  // Existing usage balances are integer credits, so fractional official prices
  // are reserved using a conservative round-up.
  return Math.ceil(amount);
}
