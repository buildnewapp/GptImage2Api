"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Sparkles, Zap } from "lucide-react";

import { UserAvatar } from "@/components/header/UserAvatar";
import VideoHeaderLinks from "@/components/home/video/HeaderLinks";
import VideoLocaleSwitcher from "@/components/home/video/LocaleSwitcher";
import VideoMobileMenu from "@/components/home/video/MobileMenu";
import { ThemeToggle } from "@/components/home/video/ThemeToggle";
import { videoThemeVarsClass } from "@/components/home/video/constants";
import { Link as I18nLink, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { user as userSchema } from "@/lib/db/schema";
import { useTranslations } from "next-intl";

type User = typeof userSchema.$inferSelect;

interface VideoHeaderShellProps {
  totalAvailableCredits?: number | null;
  user?: User | null;
}

export default function HeaderShell({
  totalAvailableCredits,
  user,
}: VideoHeaderShellProps) {
  const t = useTranslations("Home");
  const pathname = usePathname();
  const [overlay, setOverlay] = useState(() => pathname === "/");
  const accountButtonClassName = cn(
    "h-10 rounded-full border px-3 py-2 text-sm shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring/70 focus:ring-offset-2",
    overlay
      ? "border-white/16 bg-white/8 text-white hover:border-white/24 hover:bg-white/12"
      : "border-border/75 bg-background/80 text-foreground hover:border-border hover:bg-card/90",
  );
  const avatarTriggerClassName = cn(
    "h-10 w-10 rounded-full border transition-all duration-200",
    overlay
      ? "border-white/16 bg-white/8 text-white hover:border-white/24 hover:bg-white/12"
      : "border-border/75 bg-background/80 text-foreground hover:border-border hover:bg-card/90",
  );
  const avatarClassName = cn(
    "h-10 w-10 border",
    overlay ? "border-white/12" : "border-border/60",
  );
  const creditsButtonClassName = cn(
    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2",
    overlay
      ? "border-white/16 bg-white/10 text-white/80 hover:border-white/24 hover:bg-white/12"
      : "border-border/75 bg-background/80 text-foreground/80 hover:border-border hover:bg-card/90",
  );

  useEffect(() => {
    if (pathname !== "/") {
      setOverlay(false);
      return undefined;
    }

    const heroSentinel = document.querySelector(
      "[data-video-hero-sentinel]",
    );

    if (!heroSentinel) {
      setOverlay(false);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setOverlay(entry.isIntersecting);
      },
      {
        rootMargin: "-80px 0px 0px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(heroSentinel);

    return () => observer.disconnect();
  }, [pathname]);

  return (
    <header
      data-video-header-shell
      data-header-contrast-mode={overlay ? "overlay" : "default"}
      className={cn(
        "fixed top-0 z-50 w-full transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
        videoThemeVarsClass,
        overlay
          ? "border-white/12 bg-transparent"
          : "bg-background/82 shadow backdrop-blur-xl",
      )}
    >
      <nav className="container mx-auto flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-4 lg:gap-8">
          <I18nLink
            href="/"
            title={t("title")}
            prefetch={true}
            className="flex items-center gap-3"
          >
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-300",
                overlay
                  ? "border-white/20 bg-white/10 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.9)]"
                  : "border-border/75 bg-background/70 backdrop-blur-md",
              )}
            >
              <Image src="/logo.png" alt="Logo" width={28} height={28} />
            </span>
            <span
              className={cn(
                "[font-family:var(--font-instrument-serif),serif] text-[clamp(1.38rem,1.18rem+0.62vw,1.56rem)] leading-[1.08] tracking-[-0.01em] whitespace-nowrap transition-colors duration-300",
                overlay
                  ? "text-white drop-shadow-[0_1px_18px_rgba(15,23,42,0.55)]"
                  : "text-foreground",
              )}
            >
              {t("title")}
            </span>
          </I18nLink>

          <div className="hidden lg:block">
            <VideoHeaderLinks overlay={overlay} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <VideoLocaleSwitcher overlay={overlay} />
            <ThemeToggle overlay={overlay} />
            {user && typeof totalAvailableCredits === "number" ? (
              <I18nLink
                href="/dashboard/credit-history"
                className={creditsButtonClassName}
              >
                <Zap className="h-4 w-4 text-primary" />
                <span>
                  {totalAvailableCredits.toLocaleString()}
                </span>
              </I18nLink>
            ) : null}
            <UserAvatar
              user={user as User}
              totalAvailableCredits={totalAvailableCredits}
              avatarClassName={avatarClassName}
              loginButtonClassName={accountButtonClassName}
              triggerClassName={avatarTriggerClassName}
            />
            <I18nLink
              href="/dashboard/generate"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--secondary))_0%,hsl(var(--primary))_100%)] px-5 text-sm font-semibold text-white shadow-[0_22px_38px_-22px_rgba(15,23,42,0.82)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t("createVideo")}
            </I18nLink>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <VideoMobileMenu
              overlay={overlay}
              user={user as User}
              totalAvailableCredits={totalAvailableCredits}
            />
          </div>
        </div>
      </nav>
    </header>
  );
}
