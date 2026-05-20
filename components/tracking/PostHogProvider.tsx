"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
type PostHogClient = typeof import("posthog-js").default;
type LoadedPostHogProvider = ComponentType<{
  children: ReactNode;
  client: PostHogClient;
}>;

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!posthogKey || !posthogHost) {
    return <>{children}</>;
  }

  return (
    <ConfiguredPostHogProvider
      posthogHost={posthogHost}
      posthogKey={posthogKey}
    >
      {children}
    </ConfiguredPostHogProvider>
  );
}

function ConfiguredPostHogProvider({
  children,
  posthogHost,
  posthogKey,
}: {
  children: React.ReactNode;
  posthogHost: string;
  posthogKey: string;
}) {
  const [posthogClient, setPosthogClient] = useState<PostHogClient | null>(null);
  const [LoadedProvider, setLoadedProvider] =
    useState<LoadedPostHogProvider | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPostHog() {
      const [{ default: posthog }, { PostHogProvider: PHProvider }] =
        await Promise.all([
          import("posthog-js"),
          import("posthog-js/react"),
        ]);

      if (!mounted) {
        return;
      }

      posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
      });

      setPosthogClient(posthog);
      setLoadedProvider(() => PHProvider as LoadedPostHogProvider);
    }

    void loadPostHog();

    return () => {
      mounted = false;
    };
  }, [posthogHost, posthogKey]);

  if (!posthogClient || !LoadedProvider) {
    return <>{children}</>;
  }

  return <LoadedProvider client={posthogClient}>{children}</LoadedProvider>;
}
