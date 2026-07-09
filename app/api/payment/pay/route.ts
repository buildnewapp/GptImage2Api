import { createHmac, randomBytes } from "node:crypto";
import { apiResponse } from "@/lib/api-response";
import { getSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { session as sessionSchema, user as userSchema } from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/error-utils";
import { verifyPaymentHandoffToken } from "@/lib/payments/handoff";
import {
  getMainPaymentSiteUrl,
  getPaymentPayUrl,
  isMainPaymentSite,
} from "@/lib/payments/main-site";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const AUTH_SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30;

async function getUserForHandoff(userId: string) {
  const [user] = await getDb()
    .select({
      email: userSchema.email,
      id: userSchema.id,
    })
    .from(userSchema)
    .where(eq(userSchema.id, userId))
    .limit(1);

  return user ?? null;
}

function getBetterAuthBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    getMainPaymentSiteUrl()
  );
}

function shouldUseSecureAuthCookies() {
  return getBetterAuthBaseUrl().startsWith("https://");
}

function getBetterAuthCookieName(name: string) {
  return `${shouldUseSecureAuthCookies() ? "__Secure-" : ""}better-auth.${name}`;
}

function serializeCookie({
  maxAge,
  name,
  value,
}: {
  maxAge: number;
  name: string;
  value: string;
}) {
  const parts = [
    `${name}=${value}`,
    `Max-Age=${Math.floor(maxAge)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (shouldUseSecureAuthCookies()) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function serializeExpiredCookie(name: string) {
  const parts = [
    `${name}=`,
    "Max-Age=0",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (shouldUseSecureAuthCookies()) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function signBetterAuthCookieValue(value: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required for automatic login.");
  }

  const signature = createHmac("sha256", secret).update(value).digest("base64");
  return encodeURIComponent(`${value}.${signature}`);
}

async function createHandoffLoginCookies(userId: string, req: Request) {
  const token = randomBytes(24).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + AUTH_SESSION_EXPIRES_IN_SECONDS * 1000,
  );

  await getDb().insert(sessionSchema).values({
    expiresAt,
    ipAddress:
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null,
    token,
    userAgent: req.headers.get("user-agent") || null,
    userId,
  });

  const name = getBetterAuthCookieName("session_token");
  const value = signBetterAuthCookieValue(token);

  return {
    setCookie: serializeCookie({
      maxAge: AUTH_SESSION_EXPIRES_IN_SECONDS,
      name,
      value,
    }),
  };
}

function expireBetterAuthSessionDataCookies(response: NextResponse) {
  const sessionDataCookieName = getBetterAuthCookieName("session_data");
  response.headers.append(
    "set-cookie",
    serializeExpiredCookie(sessionDataCookieName),
  );
  for (let index = 0; index < 5; index += 1) {
    response.headers.append(
      "set-cookie",
      serializeExpiredCookie(`${sessionDataCookieName}.${index}`),
    );
  }
}

function escapeJsonForHtml(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function createAutoCheckoutResponse(checkout: unknown) {
  return new NextResponse(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <title>Redirecting...</title>
  </head>
  <body>
    <script>
      (async () => {
        const checkout = ${escapeJsonForHtml(checkout)};
        try {
          const response = await fetch("/api/payment/checkout-session", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(checkout)
          });
          const result = await response.json();
          if (!response.ok || !result.success || !result.data?.url) {
            throw new Error(result.error || "Failed to create checkout session");
          }
          window.location.replace(result.data.url);
        } catch (error) {
          document.body.textContent = error instanceof Error ? error.message : "Payment redirect failed";
        }
      })();
    </script>
  </body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!isMainPaymentSite()) {
    return token
      ? NextResponse.redirect(getPaymentPayUrl(token))
      : apiResponse.badRequest("Missing payment handoff token");
  }

  const payload = verifyPaymentHandoffToken({ token });
  if (!payload) {
    return apiResponse.badRequest("Invalid or expired payment handoff token");
  }

  try {
    const user = await getUserForHandoff(payload.userId);
    if (!user) {
      return apiResponse.unauthorized("Payment handoff user not found");
    }

    const session = await getSession();
    const sessionUserId = session?.user?.id;
    if (sessionUserId && sessionUserId !== user.id) {
      return apiResponse.forbidden("Payment handoff user mismatch");
    }

    const loginCookies = sessionUserId
      ? null
      : await createHandoffLoginCookies(user.id, req);

    const response = createAutoCheckoutResponse(payload.checkout);
    if (loginCookies) {
      response.headers.append("set-cookie", loginCookies.setCookie);
      expireBetterAuthSessionDataCookies(response);
    }
    return response;
  } catch (error) {
    console.error("Error handling payment handoff:", error);
    return apiResponse.serverError(getErrorMessage(error));
  }
}
