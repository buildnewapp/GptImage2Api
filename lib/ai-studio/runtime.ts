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

export function toBillableCredits(creditPrice: string | null | undefined) {
  const amount = Number.parseFloat(creditPrice ?? "0");

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  // Existing usage balances are integer credits, so fractional official prices
  // are reserved using a conservative round-up.
  return Math.ceil(amount);
}
