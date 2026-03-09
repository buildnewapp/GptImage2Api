import { PricingByGroup } from "@/components/pricing";
import AIVideoStudio from "@/components/ai/AIVideoStudio";
import Seedance15Capabilities from "./seedance15/Capabilities";
import Seedance15CTA from "./seedance15/CTA";
import Seedance15FAQ from "./seedance15/FAQ";
import Seedance15Hero from "./seedance15/Hero";
import Seedance15Overview from "./seedance15/Overview";
import Seedance15UseCases from "./seedance15/UseCases";

export default function Seedance15Home() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-slate-50 via-sky-50 to-cyan-50 dark:from-[#01030a] dark:via-[#040815] dark:to-[#02050f]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:38px_38px] dark:bg-[linear-gradient(rgba(34,211,238,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)]" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(15,23,42,0.03),rgba(15,23,42,0.03)_1px,transparent_1px,transparent_6px)] opacity-35 dark:bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.04),rgba(255,255,255,0.04)_1px,transparent_1px,transparent_6px)] dark:opacity-20" />
      <div className="pointer-events-none absolute -top-24 -left-20 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-500/25" />
      <div className="pointer-events-none absolute top-20 right-0 h-96 w-96 rounded-full bg-blue-400/15 blur-3xl dark:bg-fuchsia-500/20" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Seedance15Hero />
        <section id="create">
          <AIVideoStudio />
        </section>
        <Seedance15Overview />
        <Seedance15Capabilities />
        <Seedance15UseCases />
        <Seedance15FAQ />
        <PricingByGroup />
        <Seedance15CTA />
      </div>
    </div>
  );
}
