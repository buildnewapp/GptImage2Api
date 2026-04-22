import { ArrowRight, CalendarDays, Coins, Gift, ListTodo } from "lucide-react";

import { Link as I18nLink } from "@/i18n/routing";

interface PricingTaskHubItem {
  title: string;
}

interface PricingTaskHubSection {
  badgeLabel: string;
  buttonLabel: string;
  items: PricingTaskHubItem[];
  title: string;
}

interface PricingTaskHubProps {
  section: PricingTaskHubSection;
}

const iconMap = [Coins, CalendarDays, Gift];

export default function PricingTaskHub({ section }: PricingTaskHubProps) {
  return (
    <div
      data-aos="fade-up"
      className="mx-auto mt-6 flex max-w-5xl flex-col gap-3 rounded-[1.35rem] border border-border/70 bg-background/72 px-3 py-3 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.22)] backdrop-blur sm:px-4 md:flex-row md:items-center md:justify-between"
    >
      <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center">
        <span
          aria-label={section.badgeLabel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
          title={section.badgeLabel}
        >
          <ListTodo className="h-3.5 w-3.5" />
        </span>
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center">
          <p className="text-sm font-medium text-foreground">
            {section.title}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {section.items.map((item, index) => {
              const Icon = iconMap[index] ?? Gift;

              return (
                <span
                  key={item.title}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  <Icon className="h-3 w-3 text-primary" />
                  {item.title}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <I18nLink
        href="/dashboard/tasks"
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-900/10 bg-[linear-gradient(135deg,#1f2a44_0%,#253a64_100%)] px-4 text-xs font-semibold text-white shadow-[0_16px_28px_-24px_rgba(15,23,42,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:brightness-110 dark:border-white/10 dark:bg-[linear-gradient(135deg,#223a69_0%,#274b87_100%)]"
      >
        <span>{section.buttonLabel}</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </I18nLink>
    </div>
  );
}
