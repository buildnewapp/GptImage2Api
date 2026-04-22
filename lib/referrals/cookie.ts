"use client";

import Cookies from "js-cookie";

import { normalizeInviteCode } from "@/lib/referrals/invite-codes";

export const REFERRAL_COOKIE_NAME = "invite_code";
const REFERRAL_COOKIE_EXPIRATION_DAYS = 30;

export function extractInviteCodeFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const rawValue = params.get("invite");

  if (!rawValue) {
    return null;
  }

  const normalized = normalizeInviteCode(rawValue);

  return normalized.length >= 5 ? normalized : null;
}

export function shouldPersistInviteCode(
  existingInviteCode: string | null,
  nextInviteCode: string | null
): boolean {
  if (!nextInviteCode) {
    return false;
  }

  return existingInviteCode !== nextInviteCode;
}

export function captureInviteCodeFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const nextInviteCode = extractInviteCodeFromSearch(window.location.search);
  const existingInviteCode = Cookies.get(REFERRAL_COOKIE_NAME) ?? null;

  if (!shouldPersistInviteCode(existingInviteCode, nextInviteCode)) {
    return existingInviteCode;
  }

  const inviteCodeToPersist = nextInviteCode;
  if (!inviteCodeToPersist) {
    return existingInviteCode;
  }

  Cookies.set(REFERRAL_COOKIE_NAME, inviteCodeToPersist, {
    expires: REFERRAL_COOKIE_EXPIRATION_DAYS,
    sameSite: "lax",
  });

  return inviteCodeToPersist;
}

export function clearReferralCookie(): void {
  Cookies.remove(REFERRAL_COOKIE_NAME);
}
