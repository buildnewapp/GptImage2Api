"use client";

import { Link as I18nLink } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { ArrowRight, Gift, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SiReddit } from "react-icons/si";

const BANNER_HEIGHT_PX = 40;
const PROMO_COUNTDOWN_DECISECONDS = 30 * 60 * 10;

export type BannerAdItem = {
  id: "reddit" | "discount";
  href: string;
  title: string;
  badge: string;
  description: string;
  cta: string;
};

interface BannerAdClientProps {
  banners: BannerAdItem[];
  closeLabel: string;
}

function getDismissedStorageKey(id: BannerAdItem["id"]) {
  return id === "discount"
    ? "gemini-omni-flash-banner-dismissed"
    : "reddit-campaign-banner-dismissed";
}

export default function BannerAdClient({
  banners,
  closeLabel,
}: BannerAdClientProps) {
  const [ready, setReady] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<BannerAdItem["id"][]>([]);
  const [timeLeft, setTimeLeft] = useState(PROMO_COUNTDOWN_DECISECONDS);

  useEffect(() => {
    setDismissedIds(
      banners
        .filter(
          (banner) =>
            window.localStorage.getItem(getDismissedStorageKey(banner.id)) ===
            "true",
        )
        .map((banner) => banner.id),
    );
    setReady(true);
  }, [banners]);

  const discountVisible =
    ready &&
    !dismissedIds.includes("discount") &&
    banners.some((banner) => banner.id === "discount");

  useEffect(() => {
    if (!discountVisible) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((current) => Math.max(current - 1, 0));
    }, 100);

    return () => window.clearInterval(timer);
  }, [discountVisible]);

  if (!ready) {
    return null;
  }

  const visibleBanners = banners.filter(
    (banner) => !dismissedIds.includes(banner.id),
  );

  if (visibleBanners.length === 0) {
    return null;
  }

  const handleClose = (id: BannerAdItem["id"]) => {
    window.localStorage.setItem(getDismissedStorageKey(id), "true");
    setDismissedIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
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
            --promo-banner-height: ${visibleBanners.length * BANNER_HEIGHT_PX}px;
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

          @media (prefers-reduced-motion: reduce) {
            .promo-light-sweep {
              animation: none;
            }
          }
        `}
      </style>

      <div className="fixed inset-x-0 top-0 z-[60]">
        {visibleBanners.map((banner) => {
          const isDiscount = banner.id === "discount";

          return (
            <div
              key={banner.id}
              className={cn(
                "relative h-10 overflow-hidden border-b text-white",
                isDiscount
                  ? "border-purple-400/50 bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-700"
                  : "border-orange-400/40 bg-slate-950",
              )}
            >
              {isDiscount ? (
                <div
                  aria-hidden="true"
                  className="promo-light-sweep pointer-events-none absolute inset-y-0 -left-1/2 z-10 w-1/2 bg-gradient-to-r from-transparent via-white/55 to-transparent mix-blend-screen blur-sm"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1 bg-[#ff4500]"
                />
              )}

              <div className="relative z-20 mx-auto h-full max-w-7xl px-3 md:px-4">
                <I18nLink
                  href={banner.href}
                  aria-label={`${banner.title}: ${banner.cta}`}
                  className="group flex h-full cursor-pointer items-center justify-center gap-2 pr-10 text-xs outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80 md:gap-2.5 md:text-sm lg:gap-3"
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full",
                      isDiscount ? "bg-white/15" : "bg-[#ff4500]",
                    )}
                  >
                    {isDiscount ? (
                      <Gift className="size-3.5" />
                    ) : (
                      <SiReddit className="size-3.5" />
                    )}
                  </span>

                  {isDiscount ? (
                    <div className="hidden items-center gap-1 font-mono md:flex">
                      {segments.map((segment, index) => (
                        <div key={index} className="flex items-center gap-0.5">
                          <span className="rounded bg-black/80 px-2 py-1 text-xs font-bold tabular-nums text-white backdrop-blur-sm">
                            {segment}
                          </span>
                          {index < segments.length - 1 ? (
                            <span className="font-bold text-white/60">:</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <span className="max-w-[9rem] truncate whitespace-nowrap font-semibold text-white sm:max-w-none">
                    {banner.title}
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 md:px-2.5 md:py-1 md:text-xs",
                      isDiscount
                        ? "bg-white text-purple-900 ring-white/40"
                        : "bg-orange-400/15 text-orange-100 ring-orange-300/30",
                    )}
                  >
                    {banner.badge}
                  </span>
                  <span className="hidden whitespace-nowrap text-xs font-medium text-white/80 xl:inline">
                    {banner.description}
                  </span>
                  <span
                    className={cn(
                      "hidden items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition-colors duration-200 lg:inline-flex",
                      isDiscount
                        ? "bg-[#F6C453] text-[#3B2200] group-hover:bg-[#FFD56E]"
                        : "bg-[#c93600] text-white group-hover:bg-[#aa2e00]",
                    )}
                  >
                    {banner.cta}
                    <ArrowRight className="size-3.5" />
                  </span>
                </I18nLink>

                <button
                  type="button"
                  aria-label={`${closeLabel}: ${banner.title}`}
                  className="absolute right-0 top-0 flex size-10 cursor-pointer items-center justify-center text-white/75 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white md:right-1"
                  onClick={() => handleClose(banner.id)}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
