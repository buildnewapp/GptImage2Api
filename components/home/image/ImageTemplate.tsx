import { getLocale, getTranslations } from "next-intl/server";

import { getPublicPricingPlans } from "@/actions/prices/public";
import TemplateJsonLd from "@/components/home/image/TemplateJsonLd";
import { buildVideoTemplatePricingSection } from "@/components/home/video/pricing-data";
import type { VideoTemplatePage } from "@/components/home/video/types";
import { pageShellClass } from "@/components/home/video/constants";
import Hero from "@/components/home/video/Hero";
import FeatureRows from "@/components/home/video/FeatureRows";
import Scope from "@/components/home/video/Scope";
import UseCases from "@/components/home/video/UseCases";
import Showcase from "@/components/home/video/Showcase";
import Testimonials from "@/components/home/video/Testimonials";
import Pricing from "@/components/home/video/Pricing";
import FAQ from "@/components/home/video/FAQ";
import CTA from "@/components/home/video/CTA";
import BannerAd from "@/components/home/video/BannerAd";

export default async function ImageTemplate() {
  const locale = await getLocale();
  const t = await getTranslations("ImageTemplate");
  const plansResult = await getPublicPricingPlans();
  const plans = plansResult.success ? plansResult.data ?? [] : [];

  if (!plansResult.success) {
    console.error("Failed to fetch public pricing plans:", plansResult.error);
  }

  const page = {
    hero: t.raw("hero"),
    featureRows: t.raw("featureRows"),
    scope: t.raw("scope"),
    useCases: t.raw("useCases"),
    showcase: t.raw("showcase"),
    testimonials: t.raw("testimonials"),
    pricing: buildVideoTemplatePricingSection({
      baseSection: t.raw("pricing"),
      locale,
      plans,
    }),
    faq: t.raw("faq"),
    cta: t.raw("cta"),
  } as VideoTemplatePage;

  return (
    <div className={pageShellClass + " -mt-20 w-full overflow-x-hidden"}>
      <TemplateJsonLd templateName="ImageTemplate" />
      {/*<Header />*/}
      <BannerAd />
      <Hero hero={page.hero} />
      <Scope section={page.scope} />
      <UseCases section={page.useCases} />
      <Showcase section={page.showcase} />
      <div id="features">
          <FeatureRows items={page.featureRows} />
      </div>
      <Testimonials section={page.testimonials} />
      <Pricing section={page.pricing} />
      <FAQ section={page.faq} />
      <CTA section={page.cta} />
    </div>
  );
}
