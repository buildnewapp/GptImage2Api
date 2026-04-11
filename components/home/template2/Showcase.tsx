import { Sparkles } from "lucide-react";

import {
  sectionKickerClass,
  sectionTitleClass,
} from "@/components/home/template2/constants";
import { Template2ShowcaseMedia } from "@/components/home/template2/Media";
import type { HomeTemplate2ShowcaseSection } from "@/components/home/template2/types";

interface ShowcaseProps {
  section: HomeTemplate2ShowcaseSection;
}

export default function Showcase({ section }: ShowcaseProps) {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <div data-aos="fade-up" className={`${sectionKickerClass} mb-6`}>
            <Sparkles className="mr-2 h-4 w-4" />
            {section.kicker}
          </div>
          <h2 data-aos="fade-up" className={`${sectionTitleClass} mx-auto mb-4 max-w-5xl`}>
            {section.title}
          </h2>
          <p data-aos="fade-up" className="mx-auto max-w-3xl text-xl text-muted-foreground">
            {section.description}
          </p>
          <p data-aos="fade-up" className="mx-auto mt-3 max-w-3xl text-sm text-muted-foreground">
            {section.note}
          </p>
        </div>
        <Template2ShowcaseMedia videos={section.videos} />
        <div className="text-center">
          <p className="mb-6 text-lg text-muted-foreground">{section.ctaText}</p>
          <a data-aos="zoom-in"
             className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full bg-[linear-gradient(135deg,hsl(var(--secondary))_0%,hsl(var(--primary))_100%)] px-7 text-sm font-semibold text-white shadow-[0_22px_38px_-22px_rgba(15,23,42,0.82)] ring-offset-background transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:text-base"
            href="/generate"
          >
            Start Creating Now
          </a>
        </div>
      </div>
    </section>
  );
}
