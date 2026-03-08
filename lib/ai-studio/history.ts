import { extractProviderFailureReason } from "@/lib/ai-studio/execute";

type HistoryStatusReasonInput = {
  status: string;
  statusReason: string | null;
  raw: unknown;
};

function normalizeReason(reason: string | null) {
  if (typeof reason !== "string") {
    return null;
  }

  const trimmed = reason.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isSuccessLikeReason(reason: string | null) {
  if (!reason) {
    return false;
  }

  return /^(success|succeeded|completed?|ok)$/i.test(reason.trim());
}

function isAdminOverrideReason(reason: string | null) {
  if (!reason) {
    return false;
  }

  return /^marked failed by admin:/i.test(reason.trim());
}

export function getAiStudioHistoryStatusReason({
  status,
  statusReason,
  raw,
}: HistoryStatusReasonInput) {
  const normalizedStatus = status.trim().toLowerCase();
  const normalizedReason = normalizeReason(statusReason);

  if (normalizedStatus === "failed") {
    if (isAdminOverrideReason(normalizedReason)) {
      return normalizedReason;
    }

    const providerFailure = extractProviderFailureReason(raw);
    if (providerFailure) {
      return providerFailure;
    }

    if (!isSuccessLikeReason(normalizedReason)) {
      return normalizedReason;
    }

    return null;
  }

  if (isSuccessLikeReason(normalizedReason)) {
    return null;
  }

  return normalizedReason;
}
