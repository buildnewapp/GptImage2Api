import { ArrowRight, Sparkles } from "lucide-react";

import {
  displayTitleClass,
  heroMeshClass,
  sectionKickerClass,
} from "@/components/home/video/constants";
import type { VideoTemplateCta } from "@/components/home/video/types";
import { Link as I18nLink } from "@/i18n/routing";

interface CTAProps {
  section: VideoTemplateCta;
}

export default function CTA({ section }: CTAProps) {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div
          className={`${heroMeshClass} overflow-hidden rounded-[2.4rem] border border-white/10 px-6 py-8 text-white shadow-[0_36px_80px_-40px_rgba(15,23,42,0.72)] sm:px-8 sm:py-10 lg:px-12 lg:py-12`}
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
            <div className="max-w-2xl">
              <div data-aos="fade-right" className={`${sectionKickerClass} mb-6 border-white/16 bg-white/10 text-white/72`}>
                <Sparkles className="h-3.5 w-3.5" />
                {section.kicker}
              </div>
              <h2 data-aos="fade-right" className={`${displayTitleClass} max-w-4xl`}>{section.title}</h2>
              <p data-aos="fade-right" className="mt-5 max-w-xl text-base leading-7 text-white/78 sm:text-lg">
                {section.description}
              </p>
              <div data-aos="fade-right" className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <I18nLink
                  className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full bg-white px-7 text-sm font-semibold text-slate-950 ring-offset-background transition-all duration-300 ease-out hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:text-base"
                  href="/dashboard/generate"
                >
                  {section.primaryLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </I18nLink>
                <a
                  href="#features"
                  className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-white/18 bg-white/8 px-7 text-sm font-semibold text-white ring-offset-background transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/14 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:text-base"
                >
                  {section.secondaryLabel}
                </a>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {section.stats.map((stat) => (
                <div
                  key={stat.label}
                  data-aos="fade-left"
                  className="rounded-[1.5rem] border border-white/10 bg-white/8 px-5 py-4 backdrop-blur-md"
                >
                  <div className="text-3xl font-semibold tracking-[-0.04em] text-white">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-white/68">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
