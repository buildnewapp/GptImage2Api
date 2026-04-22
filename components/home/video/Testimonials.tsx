import { Quote, Star } from "lucide-react";

import {
  moduleCardClass,
  sectionTitleClass,
} from "@/components/home/video/constants";
import type { VideoTemplateTestimonials } from "@/components/home/video/types";

interface TestimonialsProps {
  section: VideoTemplateTestimonials;
}

const quoteAccentMap = {
  accent: "text-accent/20",
  amber: "text-[hsl(38_92%_50%/0.2)]",
  primary: "text-primary/20",
  rose: "text-[hsl(350_72%_56%/0.2)]",
};

export default function Testimonials({ section }: TestimonialsProps) {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 data-aos="fade-up" className={`${sectionTitleClass} mx-auto mb-4 max-w-5xl`}>
            {section.title}
          </h2>
          <p data-aos="fade-up" className="mx-auto max-w-3xl text-xl text-muted-foreground">
            {section.description}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {section.items.map((item,index) => {
            const quoteAccentClassName =
              quoteAccentMap[item.accent as keyof typeof quoteAccentMap] ??
              quoteAccentMap.primary;

            return (
              <div key={`${item.name}-${item.initials}`} data-aos="fade-up" data-aos-delay={50+index*200}>
                <div
                  className={`${moduleCardClass} relative h-full rounded-[calc(var(--radius)+0.45rem)] border-t-2 border-t-primary/15 p-8 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.04),transparent_60%)]`}
                >
                  <Quote
                    className={`absolute right-4 top-4 h-8 w-8 ${quoteAccentClassName}`}
                  />
                  <div className="mb-4 flex">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className="h-5 w-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="relative z-10 mb-6 text-lg">"{item.quote}"</p>
                  <div className="flex items-center">
                    <div className="mr-4 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(145deg,hsl(var(--secondary))_0%,hsl(var(--primary))_100%)] font-bold text-white ring-2 ring-primary/10 ring-offset-2 ring-offset-card">
                      {item.initials}
                    </div>
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-sm text-muted-foreground">{item.role}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
