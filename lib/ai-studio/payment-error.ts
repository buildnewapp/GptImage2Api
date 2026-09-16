export type AiStudioPaymentError = {
  code:
    | "AI_STUDIO_DAILY_LIMIT"
    | "AI_STUDIO_FREE_CREDIT_LIMIT"
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
    "AI_STUDIO_FREE_CREDIT_LIMIT",
    "AI_STUDIO_INSUFFICIENT_CREDITS",
    "AI_STUDIO_MEMBERSHIP_REQUIRED",
  ].includes(String(value.code));
}
