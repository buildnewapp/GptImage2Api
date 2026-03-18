import Hero from "@/components/home/template1/hero";
import Branding from "@/components/home/template1/branding";
import Feature1 from "@/components/home/template1/feature1";
import Feature2 from "@/components/home/template1/feature2";
import Feature3 from "@/components/home/template1/feature3";
import Feature from "@/components/home/template1/feature";
import Stats from "@/components/home/template1/stats";
import Testimonial from "@/components/home/template1/testimonial";
import FAQ from "@/components/home/template1/faq";
import CTA from "@/components/home/template1/cta";
import {LandingPage} from "@/types/template1";
import {getTranslations} from "next-intl/server";


export default async function HomeTemplate1() {
  const t = await getTranslations("HomeTemplate1");

  const page = {
    hero:t.raw("hero"),
    branding:t.raw("branding"),
    introduce:t.raw("introduce"),
    benefit:t.raw("benefit"),
    usage:t.raw("usage"),
    feature:t.raw("feature"),
    stats:t.raw("stats"),
    testimonial:t.raw("testimonial"),
    faq:t.raw("faq"),
    cta:t.raw("cta"),
  } as LandingPage ;

  return (
      <>
        {page.hero && <Hero hero={page.hero} />}
        {page.branding && <Branding section={page.branding} />}
        {page.introduce && <Feature1 section={page.introduce} />}
        {page.benefit && <Feature2 section={page.benefit} />}
        {page.usage && <Feature3 section={page.usage} />}
        {page.feature && <Feature section={page.feature} />}
        {/*{page.showcase && <Showcase section={page.showcase} />}*/}
        {page.stats && <Stats section={page.stats} />}

        {page.testimonial && <Testimonial section={page.testimonial} />}
        {page.faq && <FAQ section={page.faq} />}
        {page.cta && <CTA section={page.cta} />}
      </>
  );
}
