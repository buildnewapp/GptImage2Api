"use client";

import { authClient } from "@/lib/auth/auth-client";
import { ensureSignupBonusFingerprint } from "@/lib/auth/signup-bonus-fingerprint";
import { useCallback, useEffect } from "react";

export function GoogleOneTap() {
  const { data: session, isPending } = authClient.useSession();

  const initializeOneTap = useCallback(async () => {
    try {
      await ensureSignupBonusFingerprint();
      await authClient.oneTap({
        fetchOptions: {
          onSuccess: () => {
            window.location.reload();
          },
          onError: (context) => {
            console.error("One Tap Error:", context.error);
          },
        },
        onPromptNotification: (notification) => {
          console.log("One Tap Prompt Notification:", notification);
        },
      });
    } catch (error) {
      console.error("One Tap Initialize Error:", error);
    }
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      isPending ||
      session ||
      !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    ) {
      return;
    }

    let cancelled = false;
    const startOneTap = () => {
      if (!cancelled) {
        void initializeOneTap();
      }
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(startOneTap, { timeout: 5000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(startOneTap, 3000);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
    };
  }, [isPending, session, initializeOneTap]);

  return null;
}
