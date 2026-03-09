import CTA from "./seedance/CTA";
import FAQ from "./seedance/FAQ";
import Features from "./seedance/Features";
import AIVideoStudio from "@/components/ai/AIVideoStudio";
import HowItWorks from "./seedance/HowItWorks";
import { PricingByGroup } from "@/components/pricing";
import Testimonials from "./seedance/Testimonials";
import UseCases from "./seedance/UseCases";
import VideoShowcase from "./seedance/VideoShowcase";

export default function SeedanceHome() {
  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <section className="w-full bg-slate-100 dark:bg-slate-900 py-16 md:py-20">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              Seedance 2.0
            </h1>
            <p className="mt-8 text-xl md:text-2xl leading-relaxed text-slate-700 dark:text-slate-300">
              Experience{" "}
              <span className="text-blue-600 dark:text-blue-400">
                true multi-modal AI video creation.
              </span>{" "}
              Combine images, videos, audio, and text to generate cinematic
              content with precise reference capabilities, seamless video
              extension, and natural language control.
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
      <PricingByGroup />
      <FAQ />
      <CTA />
    </div>
  );
}
