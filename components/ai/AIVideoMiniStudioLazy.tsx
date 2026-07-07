"use client";

import { ImagePlus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

const AIVideoMiniStudio = lazy(() => import("@/components/ai/AIVideoMiniStudio"));

function AIVideoMiniStudioPlaceholder({
  onDockedLoad,
  onLoad,
}: {
  onDockedLoad: () => void;
  onLoad: () => void;
}) {
  const t = useTranslations("AIVideoStudio");
  const promptPlaceholder = t("form.promptPlaceholder");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [typedPrompt, setTypedPrompt] = useState("");
  const [showDocked, setShowDocked] = useState(false);

  useEffect(() => {
    let index = 0;
    let deleting = false;
    let timerId: ReturnType<typeof globalThis.setTimeout>;

    const tick = () => {
      setTypedPrompt(promptPlaceholder.slice(0, index));

      if (!deleting && index < promptPlaceholder.length) {
        index += 1;
        timerId = globalThis.setTimeout(tick, 46);
        return;
      }

      if (!deleting) {
        deleting = true;
        timerId = globalThis.setTimeout(tick, 1200);
        return;
      }

      if (index > 0) {
        index -= 1;
        timerId = globalThis.setTimeout(tick, 24);
        return;
      }

      deleting = false;
      timerId = globalThis.setTimeout(tick, 420);
    };

    tick();

    return () => globalThis.clearTimeout(timerId);
  }, [promptPlaceholder]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !("IntersectionObserver" in window)) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowDocked(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>
        {`
          @keyframes ai-mini-studio-border-spin {
            from { transform: translate3d(-50%, -50%, 0) rotate(0deg); }
            to { transform: translate3d(-50%, -50%, 0) rotate(360deg); }
          }

          @keyframes ai-mini-studio-docked-enter {
            from {
              opacity: 0;
              transform: translate3d(0, 1rem, 0) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            [data-ai-video-mini-studio-border] {
              animation: none !important;
            }

            [data-ai-video-mini-studio-docked] {
              animation: none !important;
            }
          }
        `}
      </style>

      <div
        ref={containerRef}
        data-ai-video-mini-studio-placeholder
        className="relative overflow-hidden rounded-[1.15rem] p-[1.5px] shadow-[0_22px_48px_-30px_rgba(0,0,0,0.9)] sm:rounded-[1.45rem] sm:p-[2px]"
      >
        <div
          data-ai-video-mini-studio-border
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[190%] w-[150%] bg-[conic-gradient(from_0deg,transparent_0deg,#7dd3fc_42deg,#a78bfa_72deg,transparent_110deg,transparent_180deg,#34d399_224deg,#facc15_270deg,transparent_314deg)] opacity-90"
          style={{ animation: "ai-mini-studio-border-spin 6.8s linear infinite" }}
        />
        <div className="relative rounded-[calc(1.15rem-1.5px)] bg-[#171315]/95 backdrop-blur-xl sm:rounded-[calc(1.45rem-2px)]">
          <div className="flex items-center gap-2 p-1.5 sm:gap-3 sm:p-2">
            <button
              type="button"
              onClick={onLoad}
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem] text-white/70 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 sm:h-12 sm:w-12 sm:rounded-[1rem]"
              aria-label={t("form.reference")}
            >
              <ImagePlus className="h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5" />
            </button>

            <input
              readOnly
              type="text"
              onClick={onLoad}
              onFocus={onLoad}
              aria-label={t("form.prompt")}
              value={typedPrompt}
              className="h-10 min-w-0 flex-1 cursor-pointer border-0 bg-transparent px-1 text-sm text-white/72 outline-none placeholder:text-white/48 focus-visible:ring-0 sm:h-12 sm:text-xl"
            />

            <button
              type="button"
              onClick={onLoad}
              aria-label={t("form.generate")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--secondary))_0%,hsl(var(--primary))_100%)] text-white shadow-[0_22px_38px_-22px_rgba(15,23,42,0.82)] ring-offset-background transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-12 sm:w-auto sm:px-5"
            >
              <Sparkles className="h-4 w-4 sm:mr-1.5 sm:h-[1.15rem] sm:w-[1.15rem]" />
              <span className="hidden text-sm font-semibold sm:inline">
                {t("form.generate")}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        data-ai-video-mini-studio-docked
        aria-hidden={!showDocked}
        className={`fixed bottom-6 left-1/2 z-[55] hidden w-[min(460px,calc(100vw-3rem))] -translate-x-1/2 transition-all duration-300 ease-out lg:block ${
          showDocked
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-5 scale-95 opacity-0"
        }`}
        style={showDocked ? { animation: "ai-mini-studio-docked-enter 260ms ease-out" } : undefined}
      >
        <div className="relative overflow-hidden rounded-[1.05rem] p-[1.5px] shadow-[0_20px_48px_-24px_rgba(0,0,0,0.95)] sm:rounded-[1.25rem]">
          <div
            data-ai-video-mini-studio-border
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[190%] w-[150%] bg-[conic-gradient(from_0deg,transparent_0deg,#7dd3fc_42deg,#a78bfa_72deg,transparent_110deg,transparent_180deg,#34d399_224deg,#facc15_270deg,transparent_314deg)] opacity-90"
            style={{ animation: "ai-mini-studio-border-spin 6.8s linear infinite" }}
          />
          <div className="relative rounded-[calc(1.05rem-1.5px)] bg-[#171315]/96 backdrop-blur-xl sm:rounded-[calc(1.25rem-1.5px)]">
            <div className="flex items-center gap-2 p-1.5 sm:p-2">
              <button
                type="button"
                onClick={onDockedLoad}
                className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.75rem] text-white/70 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 sm:h-10 sm:w-10"
                aria-label={t("form.reference")}
              >
                <ImagePlus className="h-4 w-4" />
              </button>

              <input
                readOnly
                type="text"
                onClick={onDockedLoad}
                onFocus={onDockedLoad}
                aria-label={t("form.prompt")}
                value={typedPrompt}
                className="h-9 min-w-0 flex-1 cursor-pointer border-0 bg-transparent px-1 text-xs text-white/72 outline-none focus-visible:ring-0"
              />

              <button
                type="button"
                onClick={onDockedLoad}
                aria-label={t("form.generate")}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--secondary))_0%,hsl(var(--primary))_100%)] text-white shadow-[0_18px_32px_-22px_rgba(15,23,42,0.82)] ring-offset-background transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AIVideoMiniStudioLazy() {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const shouldFocusPromptRef = useRef(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const loadStudio = () => {
    shouldFocusPromptRef.current = true;
    setShouldLoad(true);
  };
  const loadStudioFromDocked = () => {
    shouldFocusPromptRef.current = true;
    shellRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setShouldLoad(true);
  };

  useEffect(() => {
    if (!shouldLoad || !shouldFocusPromptRef.current) {
      return undefined;
    }

    let attempts = 0;
    const timerId = globalThis.setInterval(() => {
      attempts += 1;
      const prompt = document.getElementById("hero-prompt");

      if (prompt instanceof HTMLTextAreaElement) {
        prompt.focus();
        shouldFocusPromptRef.current = false;
        globalThis.clearInterval(timerId);
        return;
      }

      if (attempts >= 20) {
        shouldFocusPromptRef.current = false;
        globalThis.clearInterval(timerId);
      }
    }, 80);

    return () => globalThis.clearInterval(timerId);
  }, [shouldLoad]);

  return (
    <div ref={shellRef}>
      <Suspense
        fallback={(
          <AIVideoMiniStudioPlaceholder
            onDockedLoad={loadStudioFromDocked}
            onLoad={loadStudio}
          />
        )}
      >
        {shouldLoad ? (
          <AIVideoMiniStudio />
        ) : (
          <AIVideoMiniStudioPlaceholder
            onDockedLoad={loadStudioFromDocked}
            onLoad={loadStudio}
          />
        )}
      </Suspense>
    </div>
  );
}
