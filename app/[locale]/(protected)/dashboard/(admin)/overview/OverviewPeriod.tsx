"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type OverviewPeriod = "1d" | "7d" | "30d" | "90d";

type OverviewPeriodContextValue = {
  period: OverviewPeriod;
  setPeriod: (period: OverviewPeriod) => void;
};

const OverviewPeriodContext = createContext<OverviewPeriodContextValue | null>(
  null,
);

export function OverviewPeriodProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [period, setPeriod] = useState<OverviewPeriod>("7d");

  return (
    <OverviewPeriodContext.Provider value={{ period, setPeriod }}>
      {children}
    </OverviewPeriodContext.Provider>
  );
}

export function useOverviewPeriod() {
  const context = useContext(OverviewPeriodContext);

  if (!context) {
    throw new Error(
      "useOverviewPeriod must be used inside OverviewPeriodProvider",
    );
  }

  return context.period;
}

export function OverviewPeriodFilter() {
  const t = useTranslations("Overview");
  const context = useContext(OverviewPeriodContext);

  if (!context) {
    throw new Error(
      "OverviewPeriodFilter must be used inside OverviewPeriodProvider",
    );
  }

  const { period, setPeriod } = context;

  return (
    <div className="flex items-center gap-2">
      <CalendarClock
        aria-hidden="true"
        className="size-4 text-muted-foreground"
      />
      <span className="text-sm font-medium">{t("timeRange")}</span>
      <Select
        value={period}
        onValueChange={(value) => setPeriod(value as OverviewPeriod)}
      >
        <SelectTrigger
          className="w-[132px] sm:w-[156px]"
          aria-label={t("timeRange")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1d">{t("last1Day")}</SelectItem>
          <SelectItem value="7d">{t("last7Days")}</SelectItem>
          <SelectItem value="30d">{t("last30Days")}</SelectItem>
          <SelectItem value="90d">{t("last90Days")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
