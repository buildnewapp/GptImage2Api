import {
  ArrowRight,
  Code2,
  Coins,
  KeyRound,
  ListChecks,
  TerminalSquare,
  Webhook,
} from "lucide-react";

import {
  moduleCardClass,
  sectionKickerClass,
  sectionTitleClass,
} from "@/components/home/video/constants";
import type { VideoTemplateApiWorkflow } from "@/components/home/video/types";
import { Link as I18nLink } from "@/i18n/routing";

interface ApiWorkflowProps {
  section: VideoTemplateApiWorkflow;
}

const iconMap = {
  code: Code2,
  coins: Coins,
  key: KeyRound,
  list: ListChecks,
  webhook: Webhook,
};

function getPublicSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export default function ApiWorkflow({ section }: ApiWorkflowProps) {
  const requestLines = section.requestLines.map((line) =>
    line.replaceAll("https://YOUR_DOMAIN", getPublicSiteUrl()),
  );

  return (
    <section id="api" className="py-24">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
          <div>
            <div data-aos="fade-right" className={`${sectionKickerClass} mb-6`}>
              <TerminalSquare className="h-3.5 w-3.5" />
              {section.kicker}
            </div>
            <h2 data-aos="fade-right" className={`${sectionTitleClass} max-w-4xl`}>
              {section.title}
            </h2>
            <p data-aos="fade-right" className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              {section.description}
            </p>
            <div data-aos="fade-right" className="mt-8 flex flex-col gap-3 sm:flex-row">
              {section.actions.map((action) => (
                <I18nLink
                  key={action.href}
                  href={action.href}
                  className={
                    action.variant === "primary"
                      ? "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full bg-[linear-gradient(135deg,#1f2a44_0%,#253a64_100%)] px-7 text-sm font-semibold text-white shadow-[0_18px_32px_-24px_rgba(15,23,42,0.55)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-base"
                      : "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-border/80 bg-card px-7 text-sm font-semibold text-foreground shadow-[0_18px_38px_-30px_rgba(148,163,184,0.5)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-base"
                  }
                >
                  {action.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </I18nLink>
              ))}
            </div>
          </div>

          <div
            data-aos="fade-left"
            className="overflow-hidden rounded-[calc(var(--radius)+0.7rem)] border border-slate-200/80 bg-slate-950 text-slate-100 shadow-[0_34px_84px_-48px_rgba(15,23,42,0.72)] dark:border-white/10"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {section.requestLabel}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">{section.requestTitle}</h3>
              </div>
              <Code2 className="h-5 w-5 text-sky-300" />
            </div>
            <pre className="overflow-x-auto px-5 py-5 text-sm leading-7 text-slate-200">
              <code>{requestLines.join("\n")}</code>
            </pre>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {section.items.map((item, index) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap] ?? Code2;

            return (
              <div
                key={item.title}
                data-aos="fade-up"
                data-aos-delay={50 + index * 120}
                className={`${moduleCardClass} rounded-[calc(var(--radius)+0.45rem)] p-6`}
              >
                <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-[hsl(var(--primary)/0.22)] bg-[hsl(var(--primary)/0.1)] text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
