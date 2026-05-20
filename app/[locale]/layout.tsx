import { GoogleOneTap } from "@/components/auth/GoogleOneTap";
import { LanguageDetectionAlert } from "@/components/LanguageDetectionAlert";
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
  const COOKIE_CONSENT_ENABLED =
    process.env.NEXT_PUBLIC_COOKIE_CONSENT_ENABLED === "true";
  const isProduction = process.env.NODE_ENV !== "development";
  const postHogEnabled =
    isProduction &&
    !!process.env.NEXT_PUBLIC_POSTHOG_KEY &&
    !!process.env.NEXT_PUBLIC_POSTHOG_HOST;
  const googleAnalyticsEnabled =
    isProduction && !!process.env.NEXT_PUBLIC_GOOGLE_ID;
  const googleAdsenseEnabled =
    isProduction && !!process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID;
  const clarityEnabled =
    isProduction && !!process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const plausibleEnabled =
    isProduction && !!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const rybbitEnabled =
    isProduction &&
    !!process.env.NEXT_PUBLIC_RYBBIT_SRC &&
    !!process.env.NEXT_PUBLIC_RYBBIT_SITE_ID;
  const umamiEnabled =
    isProduction &&
    !!process.env.NEXT_PUBLIC_UMAMI_SRC &&
    !!process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const toltEnabled = isProduction && !!process.env.NEXT_PUBLIC_TOLT_ID;
  const crispEnabled = !!process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
  const vercelAnalyticsEnabled = isProduction && !!process.env.VERCEL_ENV;

  // Ensure that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const messages = await getMessages({ locale });
  const ConsentBannerComponent = COOKIE_CONSENT_ENABLED
    ? (await import("@/components/shared/CookieConsent/ConsentBanner")).default
    : null;
  const ConsentGateComponent = COOKIE_CONSENT_ENABLED
    ? (await import("@/components/shared/CookieConsent/ConsentGate")).default
    : null;
  const CrispChatComponent = crispEnabled
    ? (await import("@/components/support/CrispChat")).default
    : null;
  const PostHogProviderComponent = postHogEnabled
    ? (await import("@/components/tracking/PostHogProvider")).default
    : null;
  const PostHogPageViewComponent = postHogEnabled
    ? (await import("@/components/tracking/PostHogPageView")).default
    : null;
  const GoogleAnalyticsComponent = googleAnalyticsEnabled
    ? (await import("@/components/tracking/GoogleAnalytics")).default
    : null;
  const GoogleAdsenseComponent = googleAdsenseEnabled
    ? (await import("@/components/tracking/GoogleAdsense")).default
    : null;
  const MicrosoftClarityComponent = clarityEnabled
    ? (await import("@/components/tracking/MicrosoftClarity")).default
    : null;
  const PlausibleAnalyticsComponent = plausibleEnabled
    ? (await import("@/components/tracking/PlausibleAnalytics")).default
    : null;
  const RybbitScriptComponent = rybbitEnabled
    ? (await import("@/components/tracking/RybbitScript")).default
    : null;
  const UmamiScriptComponent = umamiEnabled
    ? (await import("@/components/tracking/UmamiScript")).default
    : null;
  const ToltScriptComponent = toltEnabled
    ? (await import("@/components/tracking/ToltScript")).default
    : null;
  const AnalyticsComponent = vercelAnalyticsEnabled
    ? (await import("@vercel/analytics/react")).Analytics
    : null;

  return (
    <html lang={locale || DEFAULT_LOCALE} suppressHydrationWarning>
      <head>
        {ToltScriptComponent ? <ToltScriptComponent /> : null}
      </head>
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
            {PostHogProviderComponent ? (
              <PostHogProviderComponent>
                <ReferralCapture />
                <ReferralAutoAccept />
                <SiteInit/>
                {messages.LanguageDetection && <LanguageDetectionAlert />}

                {children}
              </PostHogProviderComponent>
            ) : (
              <>
                <ReferralCapture />
                <ReferralAutoAccept />
                <SiteInit/>
                {messages.LanguageDetection && <LanguageDetectionAlert />}

                {children}
              </>
            )}
          </ThemeProvider>
        </NextIntlClientProvider>
        <GoogleOneTap />
        {CrispChatComponent ? <CrispChatComponent /> : null}
        <Toaster richColors />
        <TailwindIndicator />
        <>
          {COOKIE_CONSENT_ENABLED ? (
            <>
              {isProduction ? (
                <>
                  {AnalyticsComponent ? <AnalyticsComponent /> : null}
                  {PlausibleAnalyticsComponent ? <PlausibleAnalyticsComponent /> : null}
                  {RybbitScriptComponent ? <RybbitScriptComponent /> : null}
                  {UmamiScriptComponent ? <UmamiScriptComponent /> : null}
                  {ConsentGateComponent ? (
                    <ConsentGateComponent>
                      {GoogleAnalyticsComponent ? <GoogleAnalyticsComponent /> : null}
                      {GoogleAdsenseComponent ? <GoogleAdsenseComponent /> : null}
                      {MicrosoftClarityComponent ? <MicrosoftClarityComponent /> : null}
                      {PostHogPageViewComponent ? <PostHogPageViewComponent /> : null}
                    </ConsentGateComponent>
                  ) : null}
                </>
              ) : null}
              {ConsentBannerComponent ? <ConsentBannerComponent /> : null}
            </>
          ) : (
            <>
              {isProduction ? (
                <>
                  {AnalyticsComponent ? <AnalyticsComponent /> : null}
                  {PlausibleAnalyticsComponent ? <PlausibleAnalyticsComponent /> : null}
                  {GoogleAnalyticsComponent ? <GoogleAnalyticsComponent /> : null}
                  {GoogleAdsenseComponent ? <GoogleAdsenseComponent /> : null}
                  {MicrosoftClarityComponent ? <MicrosoftClarityComponent /> : null}
                  {RybbitScriptComponent ? <RybbitScriptComponent /> : null}
                  {UmamiScriptComponent ? <UmamiScriptComponent /> : null}
                  {PostHogPageViewComponent ? <PostHogPageViewComponent /> : null}
                </>
              ) : null}
            </>
          )}
        </>
      </body>
    </html>
  );
}
