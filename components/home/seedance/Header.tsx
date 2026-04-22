
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, LOCALE_NAMES, usePathname, useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Globe,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState, useTransition } from "react";

const Header = () => {
  const t = useTranslations("Navigation");
  const [isScrolled, setIsScrolled] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onSelectChange(nextLocale: string) {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={cn("py-2 px-6 sticky top-0 z-50 transition-all duration-300", isScrolled ? "backdrop-blur-md bg-background/80" : "bg-transparent")}>
      <nav className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-6 md:space-x-12">
          <Link href="/" className="flex items-center space-x-1" title="Seedance 2">
            <Image src="/logo.png" alt="Logo" width={24} height={24} />
            <span className="text-xl font-semibold">Seedance 2</span>
          </Link>
        </div>
        <div className="flex items-center gap-x-2 md:gap-x-4 lg:gap-x-6 flex-1 justify-end">
          <div className="hidden md:flex items-center gap-x-4">
            <div className="hidden md:flex flex-row items-center gap-x-2 text-sm text-muted-foreground">
              <Link href="/#features" className="rounded-xl px-4 py-2 flex items-center gap-x-1 hover:bg-accent-foreground/10 hover:text-accent-foreground">{t("features")}</Link>
              <Link href="/seedance2" className="rounded-xl px-4 py-2 flex items-center gap-x-1 hover:bg-accent-foreground/10 hover:text-accent-foreground">{t("generate")}</Link>
              <Link href="/pricing" className="rounded-xl px-4 py-2 flex items-center gap-x-1 hover:bg-accent-foreground/10 hover:text-accent-foreground">{t("pricing")}</Link>
            </div>

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-fit hover:bg-accent hover:text-accent-foreground transition-colors">
                  <Globe className="w-4 h-4 mr-1" />
                  <div className="hidden md:inline"><span className="pointer-events-none">{LOCALE_NAMES[locale]}</span></div>
                  <ChevronDown className="h-4 w-4 opacity-50 ml-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={locale} onValueChange={onSelectChange}>
                  {Object.entries(LOCALE_NAMES).map(([key, name]) => (
                    <DropdownMenuRadioItem key={key} value={key}>
                      {name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle (Mock - creates visual only) */}
            <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </button>

            <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent h-9 px-4 py-2 highlight-button text-white hover:text-white shadow-lg bg-black dark:bg-white dark:text-black">
              {t("signIn")}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button type="button" className="flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-fit">
              <Globe className="w-4 h-4 mr-1" />
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
            <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9">
              <Sun className="h-[1.2rem] w-[1.2rem]" />
            </button>
            <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
