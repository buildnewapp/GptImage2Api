import { sendEmail } from "@/lib/email/send";
import { grantConfiguredSignupBonusCredits } from "@/lib/credits/signup-bonus";
import { siteConfig } from "@/config/site";
import OTPCodeEmail from "@/emails/otp-code-email";
import { UserWelcomeEmail } from "@/emails/user-welcome";
import { assertAllowedSignupEmail } from "@/lib/auth/email-domain";
import { emailPassword, isSocialSignup } from "@/lib/auth/email-password";
import {
  parseSignupBonusFingerprint,
  resolveSignupBonusClientIp,
} from "@/lib/auth/signup-bonus-identifiers";
import { getDb } from "@/lib/db";
import { account, session, user, verification } from "@/lib/db/schema";
import { resolveSocialProviders } from "@/lib/auth/social-providers";
import {
  buildUserSourceData,
  parseTrackingCookie,
  saveUserSource,
  TRACKING_COOKIE_NAME,
} from "@/lib/tracking/server";
import { isTrackingEnabled } from "@/lib/tracking/shared";
import { redis } from "@/lib/upstash";
import { betterAuth, BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import {
  admin,
  anonymous,
  captcha,
  lastLoginMethod,
  oneTap,
} from "better-auth/plugins";
import { cookies, headers } from "next/headers";
import { createHmac } from "node:crypto";
import { cache } from "react";
import { and, eq, isNull } from "drizzle-orm";

const SIGNUP_BONUS_FINGERPRINT_COOKIE_NAME = "signup_bonus_fingerprint";
const USER_WELCOME_EMAIL_ENABLED = false;

function hashSignupBonusIdentifier(
  kind: "ip" | "fingerprint",
  value: string | null | undefined,
): string | null {
  const normalizedValue = value?.trim();
  if (!normalizedValue || normalizedValue === "unknown") {
    return null;
  }

  const secret =
    process.env.SIGNUP_BONUS_HASH_SECRET?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Signup bonus identifier hashing secret is not configured",
      );
    }
    return createHmac("sha256", "signup-bonus-development-only")
      .update(`${kind}:${normalizedValue}`)
      .digest("hex");
  }

  return createHmac("sha256", secret)
    .update(`${kind}:${normalizedValue}`)
    .digest("hex");
}

async function sendWelcomeEmail(createdUser: {
  email: string;
  name?: string | null;
}) {
  if (!USER_WELCOME_EMAIL_ENABLED) return;

  if (createdUser.email) {
    try {
      const unsubscribeToken = Buffer.from(createdUser.email).toString(
        "base64",
      );
      const unsubscribeLink = `${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe/newsletter?token=${unsubscribeToken}`;
      await sendEmail({
        email: createdUser.email,
        subject: `Welcome to ${siteConfig.name}!`,
        templateKey: "user-welcome",
        react: UserWelcomeEmail,
        reactProps: {
          name: createdUser.name ?? undefined,
          email: createdUser.email,
          unsubscribeLink,
        },
        isAddContacts: true,
        hasUnsubscribeLink: true,
      });
      console.log(`Welcome email sent to ${createdUser.email}`);
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }
  }
}

/**
 * Create Better Auth configuration options
 */
function createAuthConfig(
  databaseInstance: ReturnType<typeof getDb>,
): BetterAuthOptions {
  return {
    appName: siteConfig.name,
    baseURL:
      process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    advanced: {
      database: {
        // Use string 'uuid' instead of function for better edge runtime compatibility
        generateId: "uuid",
      },
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
    rateLimit: {
      enabled:
        process.env.NODE_ENV === "production" &&
        process.env.NEXT_PUBLIC_RATE_LIMIT_ENABLED === "true",
      window: 60,
      max: 100,
      customRules: {
        "/get-session": false,
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/email-otp/request-password-reset": { window: 60, max: 3 },
        "/email-otp/reset-password": { window: 60, max: 5 },
      },
      ...(redis && {
        customStorage: {
          get: async (key: string) => {
            const data = await redis!.get<{
              key: string;
              count: number;
              lastRequest: number;
            }>(key);
            return data || undefined;
          },
          set: async (
            key: string,
            value: { key: string; count: number; lastRequest: number },
          ) => {
            await redis!.set(key, value, { ex: 120 });
          },
        },
      }),
    },
    session: {
      cookieCache: { enabled: true, maxAge: 10 * 60 },
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google", "github"] },
    },
    database: drizzleAdapter(databaseInstance, {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    socialProviders: resolveSocialProviders(process.env),
    databaseHooks: {
      user: {
        create: {
          before: async (newUser) => {
            assertAllowedSignupEmail(newUser.email);
          },
          after: async (createdUser, ctx) => {
            const cookieStore = await cookies();
            const isTrackingEnabledValue = await isTrackingEnabled();
            if (isTrackingEnabledValue) {
              try {
                const trackingCookie = cookieStore.get(TRACKING_COOKIE_NAME);
                const clientData = parseTrackingCookie(trackingCookie?.value);
                const sourceData = await buildUserSourceData(
                  createdUser.id,
                  clientData || undefined,
                );
                await saveUserSource(sourceData);
                cookieStore.delete(TRACKING_COOKIE_NAME);
              } catch (error) {
                console.error("Failed to save user source data:", error);
              }
            }
            if (isSocialSignup(ctx?.path)) {
              try {
                const headerStore = await headers();
                const clientIp = resolveSignupBonusClientIp(headerStore);
                const fingerprint = parseSignupBonusFingerprint(
                  cookieStore.get(SIGNUP_BONUS_FINGERPRINT_COOKIE_NAME)?.value,
                );

                await grantConfiguredSignupBonusCredits(createdUser.id, {
                  email: createdUser.email,
                  countryCode: headerStore.get("cf-ipcountry"),
                  ipHash: hashSignupBonusIdentifier("ip", clientIp),
                  deviceHash: hashSignupBonusIdentifier(
                    "fingerprint",
                    fingerprint,
                  ),
                });
              } catch (error) {
                console.error("Failed to grant signup bonus credits:", error);
              }
            }
            if (createdUser.emailVerified) {
              await databaseInstance.update(user).set({ recallRegisteredAt: new Date() })
                .where(and(eq(user.id, createdUser.id), isNull(user.recallRegisteredAt), eq(user.isAnonymous, false)));
              await sendWelcomeEmail(createdUser);
            }
          },
        },
        update: {
          after: async (updatedUser) => {
            if (updatedUser.emailVerified) {
              await databaseInstance.update(user).set({ recallRegisteredAt: new Date() })
                .where(and(eq(user.id, updatedUser.id), isNull(user.recallRegisteredAt), eq(user.isAnonymous, false)));
            }
          },
        },
      },
      session: {
        create: {
          before: async (newSession, ctx) => {
            if (!ctx) {
              return;
            }

            const sessionUser = await ctx.context.internalAdapter.findUserById(
              newSession.userId,
            );
            assertAllowedSignupEmail(sessionUser?.email);
          },
        },
      },
    },
    trustedOrigins:
      process.env.NODE_ENV === "development"
        ? [
            process.env.NEXT_PUBLIC_SITE_URL,
            "http://localhost:*",
            "http://127.0.0.1:*",
            "http://[::1]:*",
          ].filter((origin): origin is string => Boolean(origin))
        : [process.env.NEXT_PUBLIC_SITE_URL!],
    plugins: [
      ...(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? [oneTap()] : []),
      ...(process.env.TURNSTILE_SECRET_KEY
        ? [
            captcha({
              provider: "cloudflare-turnstile",
              secretKey: process.env.TURNSTILE_SECRET_KEY,
            }),
          ]
        : []),
      emailPassword({
        enabled: process.env.NEXT_PUBLIC_EMAIL_LOGIN === "true",
        onPasswordReset: async ({ user }) => {
          if (!user.emailVerified) await sendWelcomeEmail(user);
        },
        sendVerificationOTP: async ({ email, otp, type }) => {
          await sendEmail({
            email,
            subject: `Your ${siteConfig.name} verification code: ${otp}`,
            templateKey: "otp-code-email",
            react: OTPCodeEmail,
            reactProps: { otp, type },
          });
        },
      }),
      lastLoginMethod(),
      admin(),
      anonymous(),
      nextCookies(),
    ],
  };
}

/**
 * Get Better Auth instance with fresh database connection
 *
 * Use this in Cloudflare Workers to ensure the database connection
 * is resolved within the current request context.
 *
 * @example
 * ```typescript
 * import { getAuth } from '@/lib/auth';
 *
 * export async function handler() {
 *   const auth = getAuth(); // Creates new instance with getDb()
 *   const session = await auth.api.getSession(...);
 * }
 * ```
 */
export const getAuth = cache(() => betterAuth(createAuthConfig(getDb())));

// Re-export types
export type { BetterAuthOptions };
