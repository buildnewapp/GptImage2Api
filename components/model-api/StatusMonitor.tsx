"use client";

import { Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type StatusMonitorBar = {
  successRate: number;
};

const monitorBarRates = [
  95, 96, 95, 94, 95, 95, 96, 95, 88, 95, 95, 96,
  94, 95, 95, 96, 95, 95, 94, 95, 96, 84, 95, 95,
  96, 95, 94, 95, 95, 96, 86, 95, 95, 94, 95, 96,
  95, 95, 94, 95, 96, 95, 89, 95, 95, 96, 95, 82,
];
const monitorBars: StatusMonitorBar[] = [
  ...monitorBarRates,
  ...monitorBarRates,
].map((successRate) => ({ successRate }));

export function StatusMonitor({
  title,
}: {
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [latestWindowEnd, setLatestWindowEnd] = useState<Date | null>(null);
  const recentSuccessRate =
    monitorBars[monitorBars.length - 1]?.successRate ?? 0;

  useEffect(() => {
    const now = new Date();
    const rounded = new Date(now);
    rounded.setSeconds(0, 0);
    rounded.setMinutes(Math.floor(now.getMinutes() / 10) * 10);
    setLatestWindowEnd(rounded);
  }, []);

  const labels = useMemo(() => {
    if (!latestWindowEnd) {
      return monitorBars.map(() => "");
    }

    return monitorBars.map((bar, index) => {
      const end = new Date(
        latestWindowEnd.getTime() -
          (monitorBars.length - 1 - index) * 10 * 60 * 1000,
      );
      const start = new Date(end.getTime() - 10 * 60 * 1000);

      return `${formatWindowTime(start)} - ${formatWindowTime(end)} - Success:${bar.successRate}%`;
    });
  }, [latestWindowEnd]);

  const activeBar =
    activeIndex === null ? null : monitorBars[activeIndex] ?? null;
  const activeLabel =
    activeIndex === null ? null : labels[activeIndex] || null;
  const mobileStartIndex = Math.max(0, monitorBars.length - 48);
  const mobileBars = monitorBars.slice(mobileStartIndex);

  return (
    <div className="min-w-0 rounded-[1.4rem] border border-border bg-background/66 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
          <Info className="h-4 w-4 shrink-0" />
        </div>
        <div className="shrink-0 rounded-[0.65rem] border border-emerald-500/20 bg-emerald-500/8 px-3 py-1 text-xs font-semibold text-emerald-600">
          Success:{recentSuccessRate}%
        </div>
      </div>

      <div
        className="relative mt-3"
        onMouseLeave={() => setActiveIndex(null)}
      >
        {activeBar && activeLabel ? (
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 inline-flex max-w-full -translate-x-1/2 -translate-y-[calc(100%+0.5rem)] items-center gap-2 rounded-[0.55rem] border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="truncate">{activeLabel}</span>
          </div>
        ) : null}

        <div className="grid min-w-0 grid-cols-48 items-end gap-px overflow-visible sm:hidden">
          {mobileBars.map((bar, index) => (
            <MonitorBar
              key={`${bar.successRate}-${mobileStartIndex + index}`}
              bar={bar}
              label={labels[mobileStartIndex + index] ?? ""}
              onMouseEnter={() => setActiveIndex(mobileStartIndex + index)}
            />
          ))}
        </div>

        <div className="hidden grid-cols-[repeat(96,minmax(3px,1fr))] items-end gap-1 overflow-visible sm:grid">
          {monitorBars.map((bar, index) => (
            <MonitorBar
              key={`${bar.successRate}-${index}`}
              bar={bar}
              label={labels[index] ?? ""}
              onMouseEnter={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MonitorBar({
  bar,
  label,
  onMouseEnter,
}: {
  bar: StatusMonitorBar;
  label: string;
  onMouseEnter: () => void;
}) {
  return (
    <span
      className="group relative flex h-8 items-end justify-center"
      title={label}
      aria-label={label}
      onMouseEnter={onMouseEnter}
    >
      <span className="relative flex h-8 w-full max-w-2 flex-col overflow-hidden rounded-[0.18rem] transition-all duration-150 group-hover:h-12 group-hover:-translate-y-1 group-hover:shadow-[0_14px_24px_-14px_rgba(15,23,42,0.45)] sm:max-w-none">
        <span
          className="w-full bg-emerald-400"
          style={{ height: `${bar.successRate}%` }}
        />
        <span
          className="w-full bg-rose-400"
          style={{ height: `${100 - bar.successRate}%` }}
        />
      </span>
    </span>
  );
}

function formatWindowTime(date: Date) {
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  const timePart = [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join(":");

  return `${datePart} ${timePart}`;
}
