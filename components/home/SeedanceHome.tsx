import CTA from "./seedance/CTA";
import FAQ from "./seedance/FAQ";
import Features from "./seedance/Features";
import Hero from "./seedance/Hero";
import HowItWorks from "./seedance/HowItWorks";
import Pricing from "./seedance/Pricing";
import Testimonials from "./seedance/Testimonials";
import UseCases from "./seedance/UseCases";
import VideoShowcase from "./seedance/VideoShowcase";

export default function SeedanceHome() {
  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <Hero />
      <VideoShowcase />
      <Features />
      <UseCases />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
    </div>
  );
}
