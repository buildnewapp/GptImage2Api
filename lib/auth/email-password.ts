import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP, type EmailOTPOptions } from "better-auth/plugins";
import { assertAllowedSignupEmail } from "@/lib/auth/email-domain";
import { normalizeEmail } from "@/lib/email";

export function isSocialSignup(path: string | undefined) {
  return (
    !!path &&
    (path.startsWith("/callback/") ||
      path === "/sign-in/social" ||
      path === "/one-tap/callback")
  );
}

// Use the same verification flow to register a new email or set an existing
// account's password. Neither operation creates a session before verification.
export function emailPassword({
  enabled,
  sendVerificationOTP,
  onPasswordReset,
}: {
  enabled: boolean;
  sendVerificationOTP: EmailOTPOptions["sendVerificationOTP"];
  onPasswordReset?: NonNullable<
    BetterAuthOptions["emailAndPassword"]
  >["onPasswordReset"];
}) {
  const otp = emailOTP({
    otpLength: 6,
    expiresIn: 60 * 10,
    allowedAttempts: 3,
    storeOTP: "hashed",
    disableSignUp: true,
    sendVerificationOTP,
  });

  return {
    ...otp,
    init() {
      return {
        options: {
          emailAndPassword: {
            enabled,
            requireEmailVerification: true,
            autoSignIn: false,
            revokeSessionsOnPasswordReset: true,
            onPasswordReset,
          },
          // The sign-up after hook sends one password-setting OTP for both
          // new and existing emails, including Better Auth's duplicate response.
          emailVerification: { sendOnSignUp: false },
          disabledPaths: [
            "/sign-in/email-otp",
            "/email-otp/verify-email",
            "/email-otp/send-verification-otp",
            ...(!enabled
              ? [
                  "/email-otp/request-password-reset",
                  "/email-otp/reset-password",
                  "/forget-password/email-otp",
                ]
              : []),
          ],
        },
      };
    },
    hooks: {
      before: [
        {
          matcher: (ctx: { path?: string }) => ctx.path === "/sign-up/email",
          handler: createAuthMiddleware(async (ctx) => {
            ctx.body.email = normalizeEmail(ctx.body.email);
            assertAllowedSignupEmail(ctx.body.email);
          }),
        },
      ],
      after: [
        {
          matcher: (ctx: { path?: string }) => ctx.path === "/sign-up/email",
          handler: createAuthMiddleware(async (ctx) => {
            let result = ctx.context.returned;
            if (!result || result instanceof APIError) return;
            if (result instanceof Response) {
              if (!result.ok) return;
              result = await result.clone().json();
            }
            if (!result || typeof result !== "object" || !("user" in result))
              return;

            await otp.endpoints.requestPasswordResetEmailOTP({
              ...ctx,
              method: "POST",
              body: { email: normalizeEmail(ctx.body.email) },
            });
          }),
        },
      ],
    },
  };
}
