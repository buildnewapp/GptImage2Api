import {
  Megaphone,
  Monitor,
  Palette,
  Store,
  Target,
  Users,
} from "lucide-react";

import {
  moduleCardClass,
  sectionTitleClass,
} from "@/components/home/video/constants";
import type { VideoTemplateUseCases } from "@/components/home/video/types";

interface UseCasesProps {
  section: VideoTemplateUseCases;
}

const iconMap = {
  megaphone: Megaphone,
  monitor: Monitor,
  palette: Palette,
  store: Store,
  target: Target,
  users: Users,
};

const accentMap = {
  accent:
    "border-[hsl(var(--accent)/0.24)] bg-[linear-gradient(145deg,hsl(var(--accent)/0.2),hsl(var(--card))_88%)] text-accent shadow-[0_18px_40px_-28px_hsl(var(--accent)/0.35)]",
  amber:
    "border-[hsl(38_92%_50%/0.24)] bg-[linear-gradient(145deg,hsl(38_92%_50%/0.14),hsl(var(--card))_88%)] text-[hsl(38_92%_50%)] shadow-[0_18px_40px_-28px_hsl(38_92%_50%/0.4)]",
  foreground:
    "border-border/85 bg-[linear-gradient(145deg,hsl(var(--secondary)/0.14),hsl(var(--card))_92%)] text-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.42)]",
  primary:
    "border-[hsl(var(--primary)/0.2)] bg-[linear-gradient(145deg,hsl(var(--primary)/0.18),hsl(var(--card))_88%)] text-primary shadow-[0_18px_40px_-28px_hsl(var(--primary)/0.45)]",
  rose:
    "border-[hsl(350_72%_56%/0.2)] bg-[linear-gradient(145deg,hsl(350_72%_56%/0.14),hsl(var(--card))_88%)] text-[hsl(350_72%_56%)] shadow-[0_18px_40px_-28px_hsl(350_72%_56%/0.4)]",
  violet:
    "border-[hsl(270_72%_56%/0.2)] bg-[linear-gradient(145deg,hsl(270_72%_56%/0.14),hsl(var(--card))_88%)] text-[hsl(270_72%_56%)] shadow-[0_18px_40px_-28px_hsl(270_72%_56%/0.4)]",
};

export default function UseCases({ section }: UseCasesProps) {
  return (
    <section className="bg-muted/30 py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 data-aos="fade-up" className={`${sectionTitleClass} mx-auto mb-4 max-w-5xl`}>
            {section.title}
          </h2>
          <p data-aos="fade-up" className="mx-auto max-w-3xl text-xl text-muted-foreground">
            {section.description}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {section.items.map((item,index) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap] ?? Megaphone;
            const accentClassName =
              accentMap[item.accent as keyof typeof accentMap] ??
              accentMap.foreground;

            return (
              <div data-aos="fade-up" data-aos-delay={50+index*200} key={item.title}>
                <div
                  className={`${moduleCardClass} h-full rounded-[calc(var(--radius)+0.45rem)] p-6`}
                >
                  <span
                    className={`relative mb-5 inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-[1.4rem] border backdrop-blur-sm before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,hsl(var(--foreground)/0.08),transparent_65%)] before:opacity-70 ${accentClassName}`}
                  >
                    <span className="relative z-10">
                      <Icon className="h-6 w-6" />
                    </span>
                  </span>
                  <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
