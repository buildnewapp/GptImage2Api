"use client";

import { DynamicIcon } from "@/components/DynamicIcon";
import LoginButton from "@/components/header/LoginButton";
import { UserCreditBadge } from "@/components/header/UserCreditBadge";
import { resolveHeaderLinks } from "@/components/home/video/HeaderLinks";
import VideoLocaleSwitcher from "@/components/home/video/LocaleSwitcher";
import { ThemeToggle } from "@/components/home/video/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link as I18nLink, useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth/auth-client";
import { user as userSchema } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import type { HeaderLink } from "@/types/common";
import { BookOpen, GraduationCap, LogOut, Menu, Newspaper, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type User = typeof userSchema.$inferSelect;

type UserMenu = {
  name: string;
  href: string;
  target?: string;
  icon?: string;
};

interface VideoMobileMenuProps {
  overlay?: boolean;
  user?: User | null;
  totalAvailableCredits?: number | null;
}

const resourceLinks = [
  { href: "/docs", icon: BookOpen, label: "Docs" },
  { href: "/learn", icon: GraduationCap, label: "Learn" },
  { href: "/blog", icon: Newspaper, label: "Blog" },
];

export function VideoMobileUserCard({
  overlay = false,
  onNavigate,
  totalAvailableCredits,
  user,
}: {
  overlay?: boolean;
  onNavigate: (href: string, target?: string) => void;
  totalAvailableCredits?: number | null;
  user?: User | null;
}) {
  const tLogin = useTranslations("Login");
  const router = useRouter();
  const userMenus = tLogin.raw("UserMenus") as UserMenu[];

  if (!user) {
    return (
      <div
        className={cn(
          "rounded-[1.5rem] border p-3",
          overlay ? "border-white/12 bg-white/6" : "border-border/70 bg-card/80"
        )}
      >
        <p className={cn("mb-2 text-sm font-medium", overlay ? "text-white" : "text-foreground")}>
          Account
        </p>
        <p className={cn("mb-4 text-sm", overlay ? "text-white/66" : "text-muted-foreground")}>
          Sign in to access billing, API keys, and your video history.
        </p>
        <LoginButton />
      </div>
    );
  }

  const fallbackLetter = user.email[0].toUpperCase();

  const signOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.refresh();
        },
      },
    });
  };

  return (
    <div
      className={cn(
        "rounded-[1.5rem] border p-3",
        overlay ? "border-white/12 bg-white/6 text-white" : "border-border/70 bg-card/80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className={cn("h-9 w-9 border", overlay ? "border-white/15" : "border-border/70")}>
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback>{fallbackLetter}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex gap-2">
              <p className="text-sm font-medium">{user.name || "User"}</p>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs",
                  overlay ? "text-white/60" : "text-muted-foreground"
                )}
              >
                <UserCreditBadge totalAvailableCredits={totalAvailableCredits} />
              </div>
            </div>
            <p className={cn("text-xs", overlay ? "text-white/60" : "text-muted-foreground")}>
              {user.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          className={cn(
            "text-sm transition-colors",
            overlay ? "text-white/60 hover:text-white" : "text-muted-foreground hover:text-foreground"
          )}
          aria-label={tLogin("Button.signOut")}
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-1">
        {userMenus.map((menu) => (
          <button
            key={menu.href}
            type="button"
            onClick={() => onNavigate(menu.href, menu.target)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-medium transition-colors",
              overlay
                ? "text-white/72 hover:bg-white/8 hover:text-white"
                : "text-muted-foreground hover:bg-muted/60 hover:text-primary"
            )}
          >
            {menu.icon ? (
              <DynamicIcon name={menu.icon} className="h-4 w-4" />
            ) : null}
            <span>{menu.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function VideoMobileMenu({
  overlay = false,
  totalAvailableCredits,
  user,
}: VideoMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const tHome = useTranslations("Home");
  const tHeader = useTranslations("Header");
  const topLinks = resolveHeaderLinks(tHeader.raw("links") as HeaderLink[]);

  const handleNavigate = (href: string, target?: string) => {
    setOpen(false);

    if (target === "_blank") {
      window.open(href, "_blank");
      return;
    }

    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          overlay
            ? "border-white/16 bg-white/8 text-white hover:bg-white/12"
            : "border-border/75 bg-background/70 text-foreground hover:bg-card"
        )}
        aria-label={tHome("mobileMenuLabel")}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open ? (
        <div
          className={cn(
            "fixed inset-x-0 top-20 z-40 w-full border-t shadow-[0_28px_42px_-34px_rgba(15,23,42,0.65)] backdrop-blur-xl md:hidden",
            overlay
              ? "border-white/12 bg-[rgba(2,8,23,0.92)] text-white"
              : "border-border/70 bg-white dark:bg-[#0c0a08]"
          )}
        >
          <div className="container mx-auto space-y-4 px-4 py-5">
            {topLinks.map((link, index) => (
              <I18nLink
                key={link.href}
                className={cn(
                  "block text-sm font-semibold uppercase tracking-[0.16em] transition-colors",
                  index === 0
                    ? overlay
                      ? "text-white"
                      : "text-primary hover:text-primary"
                    : overlay
                      ? "text-white/68 hover:text-white"
                      : "text-muted-foreground hover:text-primary"
                )}
                href={link.href}
                prefetch={link.target === "_blank" ? false : true}
                target={link.target || "_self"}
                rel={link.rel || undefined}
                onClick={() => setOpen(false)}
              >
                {link.name}
              </I18nLink>
            ))}

            <div className="flex gap-2">
              <VideoLocaleSwitcher overlay={overlay} />
              <ThemeToggle overlay={overlay} />
              <I18nLink
                  className="flex-1 inline-flex h-11 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--secondary))_0%,hsl(var(--primary))_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_22px_38px_-22px_rgba(15,23,42,0.82)] ring-offset-background transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  href="/dashboard/generate"
                  onClick={() => setOpen(false)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {tHome("createVideo")}
              </I18nLink>
            </div>


            <div className={cn("border-t pt-3", overlay ? "border-white/12" : "border-border/70")}>
              <VideoMobileUserCard
                overlay={overlay}
                onNavigate={handleNavigate}
                totalAvailableCredits={totalAvailableCredits}
                user={user}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
