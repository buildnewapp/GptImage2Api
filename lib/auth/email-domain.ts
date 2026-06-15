import { APIError } from "better-auth/api";

const ALLOWED_SIGNUP_EMAIL_DOMAINS = new Set(["gmail.com", "tikdek.com"]);
export const GMAIL_ONLY_SIGNUP_ERROR =
  "Only gmail.com or tikdek.com email addresses are allowed.";

export function isAllowedSignupEmail(email: string | null | undefined) {
  const domain = email?.trim().toLowerCase().split("@").pop();
  return !!domain && ALLOWED_SIGNUP_EMAIL_DOMAINS.has(domain);
}

export function assertAllowedSignupEmail(email: string | null | undefined) {
  if (isAllowedSignupEmail(email)) {
    return;
  }

  throw new APIError("FORBIDDEN", {
    message: GMAIL_ONLY_SIGNUP_ERROR,
    code: "GMAIL_ONLY_SIGNUP",
  });
}
