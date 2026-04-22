export const API_KEY_STATUS_ACTIVE = "active";
export const API_KEY_STATUS_DISABLED = "disabled";

export const API_KEY_STATUSES = [
  API_KEY_STATUS_ACTIVE,
  API_KEY_STATUS_DISABLED,
] as const;

export type ApiKeyStatus = (typeof API_KEY_STATUSES)[number];

export function isApiKeyStatus(value: string): value is ApiKeyStatus {
  return API_KEY_STATUSES.includes(value as ApiKeyStatus);
}

export function generateApiKeyToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

  return `sk_${hex}`;
}

export function getApiKeyPreview(apiKey: string) {
  if (apiKey.length <= 12) {
    return apiKey;
  }

  return `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`;
}

export function parseBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) {
    return null;
  }

  const matched = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  const token = matched?.[1]?.trim();

  return token || null;
}
