import FingerprintJS from "@fingerprintjs/fingerprintjs";

const SIGNUP_BONUS_FINGERPRINT_COOKIE_NAME = "signup_bonus_fingerprint";
const SIGNUP_BONUS_FINGERPRINT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

let fingerprintPromise: Promise<string | null> | null = null;

interface SignupBonusFingerprintEnvironment {
  loadVisitorId?: () => string | Promise<string>;
  writeCookie?: (cookie: string) => void;
  secure?: boolean;
}

export function buildSignupBonusFingerprintCookie(
  visitorId: string,
  secure: boolean,
): string {
  return [
    `${SIGNUP_BONUS_FINGERPRINT_COOKIE_NAME}=${visitorId}`,
    "Path=/",
    `Max-Age=${SIGNUP_BONUS_FINGERPRINT_COOKIE_MAX_AGE}`,
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export async function ensureSignupBonusFingerprint(
  environment: SignupBonusFingerprintEnvironment = {},
): Promise<boolean> {
  const usesBrowserEnvironment =
    !environment.loadVisitorId &&
    !environment.writeCookie &&
    environment.secure === undefined;
  if (usesBrowserEnvironment && typeof document === "undefined") {
    return false;
  }

  try {
    let visitorId: string | null;
    if (environment.loadVisitorId) {
      visitorId = await environment.loadVisitorId();
    } else {
      fingerprintPromise ??= FingerprintJS.load()
        .then((agent) => agent.get())
        .then((result) => result.visitorId);
      visitorId = await fingerprintPromise;
    }

    if (!visitorId) {
      fingerprintPromise = null;
      return false;
    }

    const cookie = buildSignupBonusFingerprintCookie(
      visitorId,
      environment.secure ?? window.location.protocol === "https:",
    );
    if (environment.writeCookie) {
      environment.writeCookie(cookie);
    } else {
      document.cookie = cookie;
    }
    return true;
  } catch {
    fingerprintPromise = null;
    return false;
  }
}
