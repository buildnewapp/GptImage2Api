"use client";

import { acceptReferralInviteAction } from "@/actions/referrals/user";
import { authClient } from "@/lib/auth/auth-client";
import { clearReferralCookie, REFERRAL_COOKIE_NAME } from "@/lib/referrals/cookie";
import Cookies from "js-cookie";
import { useEffect, useRef } from "react";

export default function ReferralAutoAccept() {
  const { data: session, isPending } = authClient.useSession();
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    if (isPending || !session?.user || hasAttemptedRef.current) {
      return;
    }

    const inviteCode = Cookies.get(REFERRAL_COOKIE_NAME);
    if (!inviteCode) {
      return;
    }

    hasAttemptedRef.current = true;

    void acceptReferralInviteAction(inviteCode)
      .then((result) => {
        if (result.success) {
          clearReferralCookie();
        } else {
          hasAttemptedRef.current = false;
        }
      })
      .catch(() => {
        hasAttemptedRef.current = false;
      });
  }, [isPending, session?.user]);

  return null;
}
