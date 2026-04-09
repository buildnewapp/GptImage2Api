"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type Locale,
  LOCALE_NAMES,
  routing,
  usePathname,
  useRouter,
} from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/stores/localeStore";
import { ChevronDown, Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";

interface Template2LocaleSwitcherProps {
  fullWidth?: boolean;
  overlay?: boolean;
}

export default function Template2LocaleSwitcher({
  fullWidth = false,
  overlay = false,
}: Template2LocaleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = useLocale();
  const { dismissLanguageAlert } = useLocaleStore();
  const [, startTransition] = useTransition();

  function onSelectChange(nextLocale: Locale) {
    dismissLanguageAlert();

    startTransition(() => {
      router.replace(
        // @ts-expect-error current pathname/params always match
        { pathname, params: params || {} },
        { locale: nextLocale }
      );
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center justify-between gap-2 rounded-full border px-3 py-2 text-sm shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring/70 focus:ring-offset-2",
          overlay
            ? "border-white/16 bg-white/8 text-white hover:border-white/24 hover:bg-white/12"
            : "border-border/75 bg-background/80 text-foreground hover:border-border hover:bg-card/90",
          fullWidth ? "h-10 w-full px-4" : "h-10 min-w-[7rem]"
        )}
        aria-label="Select language"
      >
        <span className="flex items-center gap-2">
          <Languages
            className={cn(
              "h-4 w-4",
              overlay ? "text-white/72" : "text-muted-foreground"
            )}
          />
          <span>{LOCALE_NAMES[locale]}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4",
            overlay ? "text-white/56" : "text-muted-foreground/70"
          )}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(
          "min-w-[9rem] rounded-[1.2rem] p-1.5 backdrop-blur-xl",
          overlay
            ? "border border-white/12 bg-slate-950/88 text-white shadow-[0_26px_60px_-36px_rgba(2,8,23,0.86)]"
            : "border border-border/70 bg-background/95 shadow-[0_26px_60px_-36px_rgba(15,23,42,0.58)]"
        )}
      >
        <DropdownMenuRadioGroup value={locale} onValueChange={onSelectChange}>
          {routing.locales.map((cur) => (
            <DropdownMenuRadioItem
              key={cur}
              value={cur}
              className={cn(
                "rounded-xl py-2 pr-3 pl-8 text-sm",
                overlay && "text-white focus:bg-white/10"
              )}
            >
              {LOCALE_NAMES[cur]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
