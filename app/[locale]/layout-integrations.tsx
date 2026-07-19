async function getLayoutIntegrations() {
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

  const ConsentBannerComponent = COOKIE_CONSENT_ENABLED
    ? (await import("@/components/shared/CookieConsent/ConsentBanner")).default
    : null;
  const ConsentGateComponent = COOKIE_CONSENT_ENABLED
    ? (await import("@/components/shared/CookieConsent/ConsentGate")).default
    : null;
  const CrispChatComponent = crispEnabled
    ? (await import("@/components/support/CrispChat")).default
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
  const SiteTrackingComponent = isProduction
    ? (await import("@/components/tracking/SiteTracking")).default
    : null;
  const ToltScriptComponent = toltEnabled
    ? (await import("@/components/tracking/ToltScript")).default
    : null;
  const AnalyticsComponent = vercelAnalyticsEnabled
    ? (await import("@vercel/analytics/react")).Analytics
    : null;

  return {
    COOKIE_CONSENT_ENABLED,
    isProduction,
    ConsentBannerComponent,
    ConsentGateComponent,
    CrispChatComponent,
    PostHogPageViewComponent,
    GoogleAnalyticsComponent,
    GoogleAdsenseComponent,
    MicrosoftClarityComponent,
    PlausibleAnalyticsComponent,
    RybbitScriptComponent,
    UmamiScriptComponent,
    SiteTrackingComponent,
    ToltScriptComponent,
    AnalyticsComponent,
  };
}

type LayoutIntegrations = Awaited<ReturnType<typeof getLayoutIntegrations>>;

export async function LayoutIntegrationScripts() {
  const integrations = await getLayoutIntegrations();
  const {
    COOKIE_CONSENT_ENABLED,
    isProduction,
    ConsentBannerComponent,
    ConsentGateComponent,
    CrispChatComponent,
    PostHogPageViewComponent,
    GoogleAnalyticsComponent,
    GoogleAdsenseComponent,
    MicrosoftClarityComponent,
    PlausibleAnalyticsComponent,
    RybbitScriptComponent,
    ToltScriptComponent,
    UmamiScriptComponent,
    SiteTrackingComponent,
    AnalyticsComponent,
  } = integrations;

  return (
    <>
      {ToltScriptComponent ? <ToltScriptComponent /> : null}
      {CrispChatComponent ? <CrispChatComponent /> : null}
      {SiteTrackingComponent ? <SiteTrackingComponent /> : null}
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
  );
}
