const ACRONYM_TOKENS = new Set([
  "ai",
  "api",
  "fps",
  "hd",
  "id",
  "nsfw",
  "sd",
  "url",
  "uri",
]);

function formatToken(token: string) {
  const normalized = token.trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (ACRONYM_TOKENS.has(normalized)) {
    return normalized.toUpperCase();
  }

  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

export function formatAiVideoStudioFieldLabel(input: string | string[]) {
  const raw = Array.isArray(input) ? input.at(-1) : input;

  if (!raw) {
    return "";
  }

  const withCamelCaseBreaks = raw.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const tokens = withCamelCaseBreaks
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .map(formatToken)
    .filter(Boolean);

  return tokens.join(" ");
}
