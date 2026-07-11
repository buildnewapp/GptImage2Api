import CTA from "./seedance/CTA";
import FAQ from "./seedance/FAQ";
import Features from "./seedance/Features";
import AIVideoStudio from "@/components/ai/AIVideoStudio";
import HomeJsonLd from "@/components/home/HomeJsonLd";
import HomeStructuredRating from "@/components/home/HomeStructuredRating";
import HowItWorks from "./seedance/HowItWorks";
import { PricingByGroup } from "@/components/pricing";
import Testimonials from "./seedance/Testimonials";
import UseCases from "./seedance/UseCases";
import VideoShowcase from "./seedance/VideoShowcase";
import { getTranslations } from "next-intl/server";

export default async function SeedanceHome({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Landing.Hero" });

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <HomeJsonLd
        locale={locale}
        description={t("description")}
        name={`${t("title")} AI Video Generator`}
      />
      <section className="w-full bg-slate-100 dark:bg-slate-900 py-16 md:py-20">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              {t("title")}
            </h1>
            <p className="mt-8 text-xl md:text-2xl leading-relaxed text-slate-700 dark:text-slate-300">
              {t("description")}
            </p>
          </div>
        </div>
      </section>
      <AIVideoStudio />
      <VideoShowcase />
      <Features />
      <UseCases />
      <HowItWorks />
      {/*<Testimonials />*/}
      <PricingByGroup locale={locale} />
      <FAQ />
      <HomeStructuredRating className="my-6" locale={locale} />
      <CTA />
    </div>
  );
}
