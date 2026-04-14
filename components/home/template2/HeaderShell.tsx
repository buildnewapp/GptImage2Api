"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";

import { UserAvatar } from "@/components/header/UserAvatar";
import Template2HeaderLinks from "@/components/home/template2/HeaderLinks";
import Template2LocaleSwitcher from "@/components/home/template2/LocaleSwitcher";
import Template2MobileMenu from "@/components/home/template2/MobileMenu";
import { ThemeToggle } from "@/components/home/template2/ThemeToggle";
import { template2ThemeVarsClass } from "@/components/home/template2/constants";
import type { HomeTemplate2Navigation } from "@/components/home/template2/types";
import { Link as I18nLink, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { user as userSchema } from "@/lib/db/schema";

type User = typeof userSchema.$inferSelect;

interface Template2HeaderShellProps {
  navigation: HomeTemplate2Navigation;
  totalAvailableCredits?: number | null;
  user?: User | null;
}

export default function HeaderShell({
  navigation,
  totalAvailableCredits,
  user,
}: Template2HeaderShellProps) {
  const pathname = usePathname();
  const [overlay, setOverlay] = useState(() => pathname === "/");

  useEffect(() => {
    if (pathname !== "/") {
      setOverlay(false);
      return undefined;
    }

    const heroSentinel = document.querySelector("[data-home-template2-hero-sentinel]");

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
      }
    );

    observer.observe(heroSentinel);

    return () => observer.disconnect();
  }, [pathname]);

  return (
    <header
      data-home-template2-header-shell
      data-header-contrast-mode={overlay ? "overlay" : "default"}
      className={cn(
        "fixed top-0 z-50 w-full transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
        template2ThemeVarsClass,
        overlay
          ? "border-white/12 bg-transparent"
          : "bg-background/82 shadow backdrop-blur-xl"
      )}
    >
      <nav className="container mx-auto flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-4 lg:gap-8">
          <I18nLink
            href="/"
            title={navigation.brand}
            prefetch={true}
            className="flex items-center gap-3"
          >
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-300",
                overlay
                  ? "border-white/20 bg-white/10 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.9)]"
                  : "border-border/75 bg-background/70 backdrop-blur-md"
              )}
            >
              <Image src="/logo.png" alt="Logo" width={28} height={28} />
            </span>
            <span
              className={cn(
                "[font-family:var(--font-instrument-serif),serif] text-[clamp(1.38rem,1.18rem+0.62vw,1.56rem)] leading-[1.08] tracking-[-0.01em] whitespace-nowrap transition-colors duration-300",
                overlay ? "text-white drop-shadow-[0_1px_18px_rgba(15,23,42,0.55)]" : "text-foreground"
              )}
            >
              {navigation.brand}
            </span>
          </I18nLink>

          <div className="hidden lg:block">
            <Template2HeaderLinks overlay={overlay} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <Template2LocaleSwitcher overlay={overlay} />
            <ThemeToggle overlay={overlay} />
            <UserAvatar
              user={user as User}
              totalAvailableCredits={totalAvailableCredits}
            />
            <I18nLink
              href="/dashboard/generate"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--secondary))_0%,hsl(var(--primary))_100%)] px-5 text-sm font-semibold text-white shadow-[0_22px_38px_-22px_rgba(15,23,42,0.82)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {navigation.createVideo}
            </I18nLink>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Template2MobileMenu
              navigation={navigation}
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
