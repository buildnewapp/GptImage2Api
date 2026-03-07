"use client";

import LoginForm from "@/components/auth/LoginForm";
import { resolveClientAuthTargetOrigin } from "@/lib/auth/client-auth-request";
import { authClient } from "@/lib/auth/auth-client";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type ClientAuthSigninPageProps = {
  clientId: string | null;
  redirectUri: string | null;
  initialError: string | null;
};

type TicketStatus = "idle" | "creating" | "success" | "error";

export default function ClientAuthSigninPage({
  clientId,
  redirectUri,
  initialError,
}: ClientAuthSigninPageProps) {
  const t = useTranslations("ClientAuth");
  const { data: session } = authClient.useSession();
  const [status, setStatus] = useState<TicketStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);
  const hasCreatedTicketRef = useRef(false);

  useEffect(() => {
    if (!clientId || !session?.user || hasCreatedTicketRef.current) {
      return;
    }

    hasCreatedTicketRef.current = true;
    setStatus("creating");
    setErrorMessage(null);

    void fetch("/api/auth/client/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        redirect_uri: redirectUri,
      }),
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | { code?: number; message?: string }
          | null;

        if (!response.ok || payload?.code !== 0) {
          throw new Error(payload?.message || "Failed to create client ticket");
        }

        const targetOrigin = resolveClientAuthTargetOrigin(redirectUri);
        const message = {
          type: "client:auth_success",
          client_id: clientId,
          redirect_uri: redirectUri,
        };

        window.opener?.postMessage(message, targetOrigin);
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(message, targetOrigin);
        }

        setStatus("success");
      })
      .catch((error) => {
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "client_auth_failed",
        );
      });
  }, [clientId, redirectUri, session?.user]);

  if (errorMessage) {
    return (
      <div className="flex items-center justify-center flex-1 py-12">
        <div className="w-full max-w-md rounded-2xl border bg-background p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">{t("errorTitle")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("errorDescription")}
          </p>
        </div>
      </div>
    );
  }

  if (status === "creating") {
    return (
      <div className="flex items-center justify-center flex-1 py-12">
        <div className="flex flex-col items-center gap-3 rounded-2xl border bg-background px-8 py-10 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex items-center justify-center flex-1 py-12">
        <div className="w-full max-w-md rounded-2xl border bg-background p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">{t("successTitle")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("successDescription")}
          </p>
        </div>
      </div>
    );
  }

  const resolvedCallbackUrl =
    typeof window === "undefined" ? undefined : window.location.href;

  return (
    <div className="flex items-center justify-center flex-1 py-12">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <LoginForm className="w-[300px]" callbackUrl={resolvedCallbackUrl} />
      </div>
    </div>
  );
}
