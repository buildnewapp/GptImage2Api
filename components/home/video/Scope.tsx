import {
  Award,
  Clapperboard,
  Globe,
  ImageIcon,
  Users,
  Zap,
} from "lucide-react";

import {
  scopeIconBadgeClass,
  sectionTitleClass,
  studioPanelClass,
  subsectionTitleClass,
} from "@/components/home/video/constants";
import type { VideoTemplateScope } from "@/components/home/video/types";

interface ScopeProps {
  section: VideoTemplateScope;
}

const iconMap = {
  award: Award,
  globe: Globe,
  image: ImageIcon,
  video: Clapperboard,
  users: Users,
  zap: Zap,
};

const accentMap = {
  accent: "text-accent",
  foreground: "text-foreground",
  primary: "text-primary",
};

export default function Scope({ section }: ScopeProps) {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 data-aos="fade-up" className={`${sectionTitleClass} mx-auto mb-4 max-w-6xl`}>
            {section.title}
          </h2>
          <p data-aos="fade-up" className="mx-auto max-w-3xl text-xl text-muted-foreground">
            {section.description}
          </p>
        </div>
        <div className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {section.items.map((item,index) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap] ?? Clapperboard;
            const accentClassName =
              accentMap[item.accent as keyof typeof accentMap] ??
              accentMap.foreground;

            return (
              <div
                key={item.title}
                data-aos="fade-up"
                data-aos-delay={50+index*200}
                className={`${studioPanelClass} rounded-[1.8rem] p-7 text-center`}
              >
                <span className={`${scopeIconBadgeClass} ${accentClassName} mb-5`}>
                  <span className="relative z-10">
                    <Icon className="h-6 w-6" />
                  </span>
                </span>
                <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            );
          })}
        </div>
        <div data-aos="fade-up"  className={`${studioPanelClass} mt-20 rounded-[2rem] p-12 text-center`}>
          <h3 className={`${subsectionTitleClass} mb-4`}>{section.footerTitle}</h3>
          <p className="mb-2 text-lg text-muted-foreground">
            {section.footerDescription}
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="flex -space-x-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-10 w-10 rounded-full border-2 border-background bg-[linear-gradient(145deg,hsl(var(--secondary))_0%,hsl(var(--primary))_100%)]"
                ></div>
              ))}
            </div>
            <span className="ml-2 text-sm text-muted-foreground">
              {section.footerStat}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
