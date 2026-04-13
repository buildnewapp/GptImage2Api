import { getLocale, getTranslations } from "next-intl/server";

import { buildHomeTemplate2PricingSection } from "@/components/home/template2/pricing-data";
import type { HomeTemplate2Page } from "@/components/home/template2/types";
import { pageShellClass } from "@/components/home/template2/constants";
import Header from "@/components/home/template2/Header";
import Hero from "@/components/home/template2/Hero";
import FeatureRows from "@/components/home/template2/FeatureRows";
import Scope from "@/components/home/template2/Scope";
import UseCases from "@/components/home/template2/UseCases";
import Showcase from "@/components/home/template2/Showcase";
import Testimonials from "@/components/home/template2/Testimonials";
import Pricing from "@/components/home/template2/Pricing";
import FAQ from "@/components/home/template2/FAQ";
import CTA from "@/components/home/template2/CTA";

export default async function HomeTemplate2() {
  const locale = await getLocale();
  const t = await getTranslations("HomeTemplate2");
  const page = {
    navigation: t.raw("navigation"),
    hero: t.raw("hero"),
    featureRows: t.raw("featureRows"),
    scope: t.raw("scope"),
    useCases: t.raw("useCases"),
    showcase: t.raw("showcase"),
    testimonials: t.raw("testimonials"),
    pricing: buildHomeTemplate2PricingSection({
      baseSection: t.raw("pricing"),
      locale,
    }),
    faq: t.raw("faq"),
    cta: t.raw("cta"),
  } as HomeTemplate2Page;

  return (
    <div className={pageShellClass + ' -mt-20 w-full'}>
      {/*<Header />*/}
      <Hero hero={page.hero} />
      <div id="features">
        <FeatureRows items={page.featureRows} />
      </div>
      <Scope section={page.scope} />
      <UseCases section={page.useCases} />
      <Showcase section={page.showcase} />
      <Testimonials section={page.testimonials} />
      <Pricing section={page.pricing} />
      <FAQ section={page.faq} />
      <CTA section={page.cta} />
    </div>
  );
}
