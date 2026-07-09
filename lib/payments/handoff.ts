import { createHmac, timingSafeEqual } from "node:crypto";

export type PaymentHandoffCheckoutRequest = {
  provider?: string;
  stripePriceId?: string;
  creemProductId?: string;
  planId?: string;
  couponCode?: string;
  referral?: string;
};

export type PaymentHandoffPayload = {
  checkout: PaymentHandoffCheckoutRequest;
  exp: number;
  iat: number;
  sourceHost?: string;
  userId: string;
  v: 1;
};

const DEFAULT_PAYMENT_HANDOFF_EXPIRES_IN_SECONDS = 10 * 60;

function encodeBase64Url(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(
    value.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export function getPaymentHandoffSecret(): string {
  const secret =
    process.env.PAYMENT_HANDOFF_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "PAYMENT_HANDOFF_SECRET or BETTER_AUTH_SECRET is required for payment handoff.",
    );
  }
  return secret;
}

export function signPaymentHandoffToken({
  expiresInSeconds = DEFAULT_PAYMENT_HANDOFF_EXPIRES_IN_SECONDS,
  now = new Date(),
  payload,
  secret = getPaymentHandoffSecret(),
}: {
  expiresInSeconds?: number;
  now?: Date;
  payload: Omit<PaymentHandoffPayload, "exp" | "iat" | "v">;
  secret?: string;
}): string {
  const iat = Math.floor(now.getTime() / 1000);
  const signedPayload: PaymentHandoffPayload = {
    ...payload,
    exp: iat + expiresInSeconds,
    iat,
    v: 1,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(signedPayload));
  const signature = sign(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyPaymentHandoffToken({
  now = new Date(),
  secret,
  token,
}: {
  now?: Date;
  secret?: string;
  token: string | null | undefined;
}): PaymentHandoffPayload | null {
  if (!token) {
    return null;
  }
  const resolvedSecret = secret ?? getPaymentHandoffSecret();

  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, resolvedSecret);
  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  const payload = safeJsonParse<PaymentHandoffPayload>(
    decodeBase64Url(encodedPayload),
  );
  if (
    payload?.v !== 1 ||
    !payload.userId ||
    !payload.checkout ||
    !payload.checkout.provider ||
    !payload.exp
  ) {
    return null;
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (payload.exp <= nowSeconds) {
    return null;
  }

  return payload;
}
