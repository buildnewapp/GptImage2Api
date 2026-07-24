import { isIP } from "node:net";

const FINGERPRINTJS_VISITOR_ID_PATTERN = /^[0-9a-f]{32}$/i;

interface HeaderReader {
  get(name: string): string | null;
}

export function parseSignupBonusFingerprint(
  value: string | null | undefined,
): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue && FINGERPRINTJS_VISITOR_ID_PATTERN.test(normalizedValue)
    ? normalizedValue.toLowerCase()
    : null;
}

export function resolveSignupBonusClientIp(
  headers: HeaderReader,
): string | null {
  const clientIp = headers.get("cf-connecting-ip")?.trim();
  return clientIp && isIP(clientIp) ? clientIp : null;
}
