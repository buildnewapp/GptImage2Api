const CLIENT_ID_MAX_LENGTH = 128;
const REDIRECT_URI_MAX_LENGTH = 1024;

export type ClientAuthParams = {
  clientId: string;
  redirectUri: string | null;
};

function normalizeClientId(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("client_id is required");
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new Error("client_id is required");
  }

  if (normalized.length > CLIENT_ID_MAX_LENGTH) {
    throw new Error("client_id is too long");
  }

  return normalized;
}

function normalizeRedirectUri(value: unknown): string | null {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("redirect_uri must be a string");
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length > REDIRECT_URI_MAX_LENGTH) {
    throw new Error("redirect_uri is too long");
  }

  return normalized;
}

export function parseClientAuthParams(
  searchParams: URLSearchParams,
): ClientAuthParams {
  return {
    clientId: normalizeClientId(searchParams.get("client_id")),
    redirectUri: normalizeRedirectUri(searchParams.get("redirect_uri")),
  };
}

export function parseClientAuthBody(body: unknown): ClientAuthParams {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object");
  }

  const payload = body as Record<string, unknown>;

  return {
    clientId: normalizeClientId(payload.client_id),
    redirectUri: normalizeRedirectUri(payload.redirect_uri),
  };
}

export function resolveClientAuthTargetOrigin(
  redirectUri: string | null | undefined,
): string {
  if (!redirectUri) {
    return "*";
  }

  try {
    const url = new URL(redirectUri);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.origin;
    }

    if (url.protocol === "chrome-extension:") {
      return `${url.protocol}//${url.hostname}`;
    }
  } catch {
    return "*";
  }

  return "*";
}
