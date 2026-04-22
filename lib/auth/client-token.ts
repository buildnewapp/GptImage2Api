export type ClientTokenUser = {
  uuid: string;
  email: string;
  nickname: string;
  avatar_url: string | null;
  created_at: string;
};

const DEFAULT_CLIENT_TOKEN_EXPIRES_IN_SECONDS = 10 * 60;

function toBase64(input: Uint8Array): string {
  let binary = "";
  for (const byte of input) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function fromBase64(input: string): string {
  return atob(input);
}

function encodeBase64Url(value: string | Uint8Array): string {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;

  return toBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  return fromBase64(normalized);
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export type ClientAccessTokenPayload = {
  user: ClientTokenUser;
  iat: number;
  exp: number;
};

export function isLikelyClientAccessToken(token: string): boolean {
  if (!token || token.startsWith("sk_")) {
    return false;
  }

  return /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(token);
}

async function signHs256(input: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(input),
  );

  return encodeBase64Url(new Uint8Array(signature));
}

export async function signClientAccessToken({
  secret,
  user,
  now = new Date(),
  expiresInSeconds = DEFAULT_CLIENT_TOKEN_EXPIRES_IN_SECONDS,
}: {
  secret: string;
  user: ClientTokenUser;
  now?: Date;
  expiresInSeconds?: number;
}): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  const exp = iat + expiresInSeconds;

  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encodeBase64Url(
    JSON.stringify({
      user,
      iat,
      exp,
    }),
  );

  const signingInput = `${header}.${payload}`;
  const signature = await signHs256(signingInput, secret);

  return `${signingInput}.${signature}`;
}

export async function verifyClientAccessToken({
  token,
  secret,
  now = new Date(),
}: {
  token: string;
  secret: string;
  now?: Date;
}): Promise<ClientAccessTokenPayload | null> {
  if (!isLikelyClientAccessToken(token)) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = await signHs256(
    `${encodedHeader}.${encodedPayload}`,
    secret,
  );
  if (expectedSignature !== encodedSignature) {
    return null;
  }

  const payload = safeJsonParse<ClientAccessTokenPayload>(
    decodeBase64Url(encodedPayload),
  );
  if (!payload?.user?.uuid || !payload?.user?.email || !payload.exp) {
    return null;
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (payload.exp <= nowSeconds) {
    return null;
  }

  return payload;
}
