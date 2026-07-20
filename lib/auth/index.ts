import { sendEmail } from "@/actions/resend";
import { grantConfiguredSignupBonusCredits } from "@/lib/credits/signup-bonus";
import { siteConfig } from "@/config/site";
import MagicLinkEmail from "@/emails/magic-link-email";
import OTPCodeEmail from "@/emails/otp-code-email";
import { UserWelcomeEmail } from "@/emails/user-welcome";
import { assertAllowedSignupEmail } from "@/lib/auth/email-domain";
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
  emailOTP,
  lastLoginMethod,
  magicLink,
  oneTap,
} from "better-auth/plugins";
import { cookies, headers } from "next/headers";
import { createHmac, randomUUID } from "node:crypto";
import { cache } from "react";

const SIGNUP_BONUS_DEVICE_COOKIE_NAME = "signup_bonus_device_id";
const SIGNUP_BONUS_DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hashSignupBonusIdentifier(
  kind: "ip" | "device",
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
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"],
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
        "/sign-in/magic-link": { window: 60, max: 3 },
        "/email-otp/send-verification-otp": { window: 60, max: 3 },
        "/sign-in/email-otp": { window: 60, max: 5 },
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
    emailAndPassword: {
      enabled: process.env.NODE_ENV === "development",
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
          after: async (createdUser) => {
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
            try {
              const headerStore = await headers();
              const forwarded = headerStore.get("x-forwarded-for");
              const clientIp =
                headerStore.get("cf-connecting-ip") ||
                headerStore.get("x-real-ip") ||
                forwarded?.split(",")[0]?.trim() ||
                null;
              const existingDeviceId = cookieStore.get(
                SIGNUP_BONUS_DEVICE_COOKIE_NAME,
              )?.value;
              const deviceId =
                existingDeviceId && UUID_PATTERN.test(existingDeviceId)
                  ? existingDeviceId
                  : randomUUID();

              if (deviceId !== existingDeviceId) {
                cookieStore.set(SIGNUP_BONUS_DEVICE_COOKIE_NAME, deviceId, {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === "production",
                  sameSite: "lax",
                  path: "/",
                  maxAge: SIGNUP_BONUS_DEVICE_COOKIE_MAX_AGE,
                });
              }

              await grantConfiguredSignupBonusCredits(createdUser.id, {
                email: createdUser.email,
                countryCode: headerStore.get("cf-ipcountry"),
                ipHash: hashSignupBonusIdentifier("ip", clientIp),
                deviceHash: hashSignupBonusIdentifier("device", deviceId),
              });
            } catch (error) {
              console.error("Failed to grant signup bonus credits:", error);
            }
            if (createdUser.email) {
              try {
                const unsubscribeToken = Buffer.from(
                  createdUser.email,
                ).toString("base64");
                const unsubscribeLink = `${process.env.NEXT_PUBLIC_SITE_URL}/unsubscribe/newsletter?token=${unsubscribeToken}`;
                await sendEmail({
                  email: createdUser.email,
                  subject: `Welcome to ${siteConfig.name}!`,
                  react: UserWelcomeEmail,
                  reactProps: {
                    name: createdUser.name,
                    email: createdUser.email,
                    unsubscribeLink,
                  },
                  isAddContacts: true,
                });
                console.log(`Welcome email sent to ${createdUser.email}`);
              } catch (error) {
                console.error("Failed to send welcome email:", error);
              }
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
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await sendEmail({
            email,
            subject: `Sign in to ${siteConfig.name}`,
            react: MagicLinkEmail,
            reactProps: { url },
          });
        },
        expiresIn: 60 * 5,
      }),
      emailOTP({
        otpLength: 6,
        expiresIn: 60 * 10,
        sendVerificationOTP: async ({ email, otp, type }) => {
          await sendEmail({
            email,
            subject: `Your ${siteConfig.name} verification code: ${otp}`,
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
