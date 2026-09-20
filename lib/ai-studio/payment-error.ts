export type AiStudioPaymentError = {
  code:
    | "AI_STUDIO_DAILY_LIMIT"
    | "AI_STUDIO_PROVIDER_DAILY_LIMIT"
    | "AI_STUDIO_INSUFFICIENT_CREDITS"
    | "AI_STUDIO_MEMBERSHIP_REQUIRED";
  requiredCredits?: number;
  requiredLevel?: string;
};

export function isAiStudioPaymentError(
  value: unknown,
): value is AiStudioPaymentError {
  if (!value || typeof value !== "object" || !("code" in value)) return false;
  return [
    "AI_STUDIO_DAILY_LIMIT",
    "AI_STUDIO_PROVIDER_DAILY_LIMIT",
    "AI_STUDIO_INSUFFICIENT_CREDITS",
    "AI_STUDIO_MEMBERSHIP_REQUIRED",
  ].includes(String(value.code));
}

export function getAiStudioPaymentError(
  value: unknown,
): AiStudioPaymentError | null {
  if (isAiStudioPaymentError(value)) {
    return value;
  }

  const message =
    value instanceof Error
      ? value.message
      : value && typeof value === "object"
        ? [
            (value as Record<string, unknown>).message,
            (value as Record<string, unknown>).error,
          ].find((item): item is string => typeof item === "string")
        : null;

  if (
    message &&
    /current number of points used by api\s*key has exceeded the daily limit/i.test(
      message,
    )
  ) {
    return { code: "AI_STUDIO_PROVIDER_DAILY_LIMIT" };
  }

  return null;
}
