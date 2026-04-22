export function isRenderableAssetUrl(value: string) {
  if (!/^https?:\/\//i.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    const pathname = url.pathname.toLowerCase();

    if (pathname.startsWith("/api/")) {
      return false;
    }

    if (pathname.includes("/callback")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
