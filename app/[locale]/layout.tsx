import { GoogleOneTap } from "@/components/auth/GoogleOneTap";
import { TailwindIndicator } from "@/components/TailwindIndicator";
import ReferralAutoAccept from "@/components/tracking/ReferralAutoAccept";
import ReferralCapture from "@/components/tracking/ReferralCapture";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import { DEFAULT_LOCALE, Locale, routing } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";
import "@/styles/loading.css";
import { LayoutIntegrationScripts } from "./layout-integrations";
import { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { Inter as FontSans } from "next/font/google";
import { notFound } from "next/navigation";
import {Instrument_Serif, Inter, Space_Grotesk} from 'next/font/google'
import SiteInit from "@/components/header/SiteInit";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

 const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

 const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
})

 const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-instrument-serif',
})

type MetadataProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home" });

  return constructMetadata({
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: `/`,
  });
}

export const viewport: Viewport = {
  themeColor: siteConfig.themeColors,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const messages = await getMessages({ locale });

  return (
    <html lang={locale || DEFAULT_LOCALE} suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background flex flex-col",
          inter.variable,
          spaceGrotesk.variable,
          instrumentSerif.variable
        )}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme={siteConfig.defaultNextTheme}
            enableSystem
          >
            <ReferralCapture />
            <ReferralAutoAccept />
            <SiteInit/>

            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
        <GoogleOneTap />
        <Toaster richColors />
        <TailwindIndicator />
        <LayoutIntegrationScripts />
      </body>
    </html>
  );
}
