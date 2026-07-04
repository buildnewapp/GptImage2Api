"use client";

import {
  getDailyGenerationStats,
  IDailyGenerationStats,
} from "@/actions/overview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useSWR from "swr";

type Period = "7d" | "30d" | "90d";

const CHART_COLORS = {
  succeeded: "#16a34a",
  failed: "#dc2626",
  credits: "#f59e0b",
};

const fetcher = async (period: Period): Promise<IDailyGenerationStats[]> => {
  const result = await getDailyGenerationStats(period);
  if (!result.success) {
    throw new Error(result.error || "Failed to load chart data.");
  }
  return result.data ?? [];
};

export const GenerationStatsChart = () => {
  const t = useTranslations("Overview");
  const [period, setPeriod] = useState<Period>("30d");

  const { data, error, isLoading } = useSWR(
    ["daily-generation-stats", period],
    () => fetcher(period),
    {
      dedupingInterval: 300000,
    }
  );

  const chartData = data ?? [];

  const totalSucceeded = chartData.reduce(
    (sum, item) => sum + item.succeededCount,
    0
  );
  const totalFailed = chartData.reduce(
    (sum, item) => sum + item.failedCount,
    0
  );
  const totalConsumedCredits = chartData.reduce(
    (sum, item) => sum + item.consumedCredits,
    0
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-md shadow-lg bg-card p-2">
          <p className="font-semibold">{label}</p>
          <p style={{ color: CHART_COLORS.succeeded }}>
            {t("generationSucceeded")}: {payload[0].value}
          </p>
          <p style={{ color: CHART_COLORS.failed }}>
            {t("generationFailed")}: {payload[1].value}
          </p>
          <p style={{ color: CHART_COLORS.credits }}>
            {t("consumedCredits")}: {payload[2].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("generationStatsTrend")}</CardTitle>
          <CardDescription>
            <span style={{ color: CHART_COLORS.succeeded }}>
              {t("generationSucceeded")}: {totalSucceeded}
            </span>
            <span className="mx-2 text-muted-foreground">|</span>
            <span style={{ color: CHART_COLORS.failed }}>
              {t("generationFailed")}: {totalFailed}
            </span>
            <span className="mx-2 text-muted-foreground">|</span>
            <span style={{ color: CHART_COLORS.credits }}>
              {t("consumedCredits")}: {totalConsumedCredits}
            </span>
          </CardDescription>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-fit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{t("last7Days")}</SelectItem>
            <SelectItem value="30d">{t("last30Days")}</SelectItem>
            <SelectItem value="90d">{t("last90Days")}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[350px] w-full" />
        ) : error ? (
          <div className="flex items-center justify-center h-[350px]">
            <p className="text-red-500">{error.message}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient
                  id="colorGenerationSucceeded"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={CHART_COLORS.succeeded}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={CHART_COLORS.succeeded}
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient
                  id="colorGenerationFailed"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={CHART_COLORS.failed}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={CHART_COLORS.failed}
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient
                  id="colorConsumedCredits"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={CHART_COLORS.credits}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={CHART_COLORS.credits}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="reportDate"
                tickFormatter={(str) => dayjs(str).format("MM/DD")}
                tickLine={false}
                axisLine={false}
              />
              <YAxis yAxisId="count" tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="credits"
                orientation="right"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                yAxisId="count"
                type="monotone"
                dataKey="succeededCount"
                name={t("generationSucceeded")}
                stroke={CHART_COLORS.succeeded}
                fill="url(#colorGenerationSucceeded)"
                fillOpacity={1}
                strokeWidth={2.5}
              />
              <Area
                yAxisId="count"
                type="monotone"
                dataKey="failedCount"
                name={t("generationFailed")}
                stroke={CHART_COLORS.failed}
                fill="url(#colorGenerationFailed)"
                fillOpacity={1}
                strokeWidth={2.5}
              />
              <Area
                yAxisId="credits"
                type="monotone"
                dataKey="consumedCredits"
                name={t("consumedCredits")}
                stroke={CHART_COLORS.credits}
                fill="url(#colorConsumedCredits)"
                fillOpacity={1}
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
