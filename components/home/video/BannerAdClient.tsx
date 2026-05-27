"use client";

import { Link as I18nLink } from "@/i18n/routing";
import { useEffect, useState } from "react";

const DISMISSED_STORAGE_KEY = "promo-banner-dismissed";
const PROMO_COUNTDOWN_DECISECONDS = 30 * 60 * 10;

interface BannerAdClientProps {
  href: string;
  title: string;
  badge: string;
  description: string;
  cta: string;
  closeLabel: string;
}

export default function BannerAdClient({
  href,
  title,
  badge,
  description,
  cta,
  closeLabel,
}: BannerAdClientProps) {
  const [visible, setVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(PROMO_COUNTDOWN_DECISECONDS);

  useEffect(() => {
    setVisible(window.localStorage.getItem(DISMISSED_STORAGE_KEY) !== "true");
  }, []);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((current) => Math.max(current - 1, 0));
    }, 100);

    return () => window.clearInterval(timer);
  }, [visible]);

  if (!visible) {
    return null;
  }

  const handleClose = () => {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, "true");
    setVisible(false);
  };

  const segments = [
    Math.floor(timeLeft / 600),
    Math.floor((timeLeft % 600) / 10),
    (timeLeft % 10) * 10,
  ].map((value) => value.toString().padStart(2, "0"));

  return (
    <>
      <style>
        {`
          :root {
            --promo-banner-height: 52px;
          }

          [data-video-header-shell] {
            top: var(--promo-banner-height);
          }

          .promo-light-sweep {
            animation: promo-light-sweep 3.2s ease-in-out infinite;
          }

          @keyframes promo-light-sweep {
            0% {
              transform: translateX(0);
            }
            55%, 100% {
              transform: translateX(300%);
            }
          }
        `}
      </style>
      <div className="fixed left-0 right-0 top-0 z-[60] overflow-hidden border-b border-purple-400/50 bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-700">
        <div
          aria-hidden="true"
          className="promo-light-sweep pointer-events-none absolute inset-y-0 -left-1/2 z-10 w-1/2 bg-gradient-to-r from-transparent via-white/55 to-transparent mix-blend-screen blur-sm"
        />
        <div className="relative z-20 mx-auto max-w-7xl px-3 py-2 md:px-4 md:py-2.5">
          <button
            type="button"
            aria-label={closeLabel}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xl leading-none text-white/80 hover:text-white md:right-3"
            onClick={handleClose}
          >
            ×
          </button>

          <div className="hidden items-center justify-center gap-2.5 pr-10 text-sm md:flex lg:gap-3">
            <span className="text-lg leading-none">🎁</span>
            <div className="flex items-center gap-1 font-mono">
              {segments.map((segment, index) => (
                <div key={index} className="flex items-center gap-0.5">
                  <span className="rounded bg-black/80 px-2 py-1 text-sm font-bold tabular-nums text-white shadow-lg backdrop-blur-sm">
                    {segment}
                  </span>
                  {index < segments.length - 1 ? (
                    <span className="text-sm font-bold text-white/60">:</span>
                  ) : null}
                </div>
              ))}
            </div>
            <span className="flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-white">
              🎉 {title}
            </span>
            <span className="whitespace-nowrap rounded-md bg-white px-2.5 py-1 text-xs font-bold text-purple-900 shadow-md ring-1 ring-white/40">
              {badge}
            </span>
            <span className="hidden whitespace-nowrap text-xs font-medium text-white/90 lg:inline">
              {description}
            </span>
            <I18nLink
              href={href}
              className="whitespace-nowrap rounded-full bg-[#F6C453] px-4 py-1.5 text-xs font-bold text-[#3B2200] shadow-lg transition-all hover:scale-105 hover:bg-[#FFD56E]"
            >
              {cta}
            </I18nLink>
          </div>

          <div className="flex items-center justify-center gap-2 pr-8 text-xs font-medium text-white md:hidden">
            <span>🎁</span>
            <span className="whitespace-nowrap font-semibold">{title}</span>
            <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold text-purple-900">
              {badge}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
