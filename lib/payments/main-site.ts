function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getConfiguredMainSiteUrl() {
  const url = process.env.MAIN_SITE_URL?.trim();
  return url ? normalizeUrl(url) : null;
}

export function getMainPaymentSiteUrl(fallbackUrl?: string) {
  const mainSiteUrl = getConfiguredMainSiteUrl();
  if (mainSiteUrl) {
    return mainSiteUrl;
  }

  return normalizeUrl(
    fallbackUrl || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  );
}

export function getPaymentRequestHost(req: Request) {
  return (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    undefined
  );
}

export function isMainPaymentSite() {
  return !getConfiguredMainSiteUrl();
}

export function getPaymentPayUrl(token: string, fallbackUrl?: string) {
  const url = new URL("/api/payment/pay", getMainPaymentSiteUrl(fallbackUrl));
  url.searchParams.set("token", token);
  return url.toString();
}
