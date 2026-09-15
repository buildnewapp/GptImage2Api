const REDACTED = "[REDACTED]";
const sensitiveKey =
  /^(otp|code|password|token|accessToken|refreshToken|idToken|secret|apiKey|authorization|unsubscribeLink)$/i;

/** Redact the snapshot only. The original variables still render the outgoing email. */
export function redactEmailLog(
  templateKey: string,
  variables: Record<string, unknown>,
) {
  const secrets = new Set<string>();
  function collectSecret(value: unknown) {
    if (typeof value !== "string" && typeof value !== "number") return;
    const text = String(value);
    if (!text) return;
    secrets.add(text);
    try {
      const url = new URL(text);
      for (const secret of url.searchParams.values())
        if (secret) secrets.add(secret);
      if (url.hash.length > 1) secrets.add(url.hash.slice(1));
    } catch {
      /* Scalar secret. */
    }
  }
  function visit(value: unknown, key = ""): unknown {
    if (
      sensitiveKey.test(key) ||
      (templateKey === "magic-link-email" && key === "url")
    ) {
      collectSecret(value);
      return REDACTED;
    }
    if (Array.isArray(value)) return value.map((item) => visit(item));
    if (value instanceof Date) return value.toISOString();
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([name, item]) => [name, visit(item, name)]),
      );
    }
    if (typeof value === "string") {
      try {
        const url = new URL(value);
        let changed = false;
        for (const [name, item] of [...url.searchParams]) {
          if (sensitiveKey.test(name)) {
            collectSecret(item);
            url.searchParams.set(name, REDACTED);
            changed = true;
          }
        }
        return changed ? url.toString() : value;
      } catch {
        return value;
      }
    }
    return value ?? null;
  }
  const snapshot = visit(variables) as Record<string, unknown>;
  const redactText = (text: string) => {
    let result = text;
    for (const secret of [...secrets].sort((a, b) => b.length - a.length)) {
      result = result.split(secret).join(REDACTED);
      result = result.split(encodeURIComponent(secret)).join(REDACTED);
    }
    return result;
  };
  // A secret may also appear in another variable (for example an error or subject).
  function redactStrings(value: unknown): unknown {
    if (typeof value === "string") return redactText(value);
    if (Array.isArray(value)) return value.map(redactStrings);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, redactStrings(item)]),
      );
    }
    return value;
  }
  return {
    variables: redactStrings(snapshot) as Record<string, unknown>,
    redactText,
  };
}
