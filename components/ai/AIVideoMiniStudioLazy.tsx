"use client";

import { lazy, Suspense, useEffect, useState } from "react";

const AIVideoMiniStudio = lazy(() => import("@/components/ai/AIVideoMiniStudio"));

function AIVideoMiniStudioPlaceholder() {
  return (
    <div
      data-ai-video-mini-studio-placeholder
      className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.06] shadow-[0_28px_60px_-36px_rgba(2,8,23,0.65)] backdrop-blur-xl"
    >
      <div className="px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
        <div className="flex gap-4">
          <div className="h-24 w-24 shrink-0 rounded-[1.35rem] border border-white/12 bg-white/[0.05] sm:h-28 sm:w-28" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-10 rounded-2xl border border-white/10 bg-white/[0.05]" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-9 rounded-full border border-white/10 bg-white/[0.05]" />
              <div className="h-9 rounded-full border border-white/10 bg-white/[0.05]" />
              <div className="h-9 rounded-full border border-white/10 bg-white/[0.05]" />
            </div>
            <div className="h-12 rounded-full bg-white/12" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIVideoMiniStudioLazy() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(
        () => setShouldLoad(true),
        { timeout: 2500 },
      );
      return () => window.cancelIdleCallback(idleId);
    }

    const timerId = globalThis.setTimeout(() => setShouldLoad(true), 1200);
    return () => globalThis.clearTimeout(timerId);
  }, []);

  return (
    <Suspense fallback={<AIVideoMiniStudioPlaceholder />}>
      {shouldLoad ? <AIVideoMiniStudio /> : <AIVideoMiniStudioPlaceholder />}
    </Suspense>
  );
}
