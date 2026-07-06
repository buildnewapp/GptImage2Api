"use client";

import {
  getGenerationBreakdownStats,
  IGenerationBreakdownStats,
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
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useSWR from "swr";

type Period = "1d" | "7d" | "30d" | "90d";

const CHART_COLORS = {
  succeeded: "#16a34a",
  failed: "#dc2626",
  credits: "#f59e0b",
};

const fetcher = async (period: Period): Promise<IGenerationBreakdownStats> => {
  const result = await getGenerationBreakdownStats(period);
  if (!result.success) {
    throw new Error(result.error || "Failed to load chart data.");
  }
  return result.data ?? { models: [], providers: [] };
};

const truncateLabel = (value: unknown, maxLength = 18) => {
  const label = String(value ?? "");
  return label.length > maxLength ? `${label.slice(0, maxLength)}...` : label;
};

export const GenerationBreakdownCharts = () => {
  const t = useTranslations("Overview");
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? "en";
  const [period, setPeriod] = useState<Period>("7d");

  const { data, error, isLoading } = useSWR(
    ["generation-breakdown-stats", period],
    () => fetcher(period),
    {
      dedupingInterval: 300000,
    }
  );

  const modelData =
    data?.models.map((item) => ({
      ...item,
      label: item.modelTitle || item.modelId,
    })) ?? [];

  const providerData =
    data?.providers.map((item) => ({
      ...item,
      successRate:
        item.totalCount > 0
          ? Math.round((item.succeededCount / item.totalCount) * 100)
          : 0,
    })) ?? [];

  const buildModelRecordsHref = (
    modelId: string,
    status?: "succeeded" | "failed"
  ) => {
    const searchParams = new URLSearchParams({ search: modelId });
    if (status) {
      searchParams.set("status", status);
    }
    return `/${locale}/dashboard/ai-studio-admin?${searchParams.toString()}`;
  };

  const buildProviderRecordsHref = (
    provider: string,
    status?: "succeeded" | "failed"
  ) => {
    const searchParams = new URLSearchParams({ search: provider });
    if (status) {
      searchParams.set("status", status);
    }
    return `/${locale}/dashboard/ai-studio-admin?${searchParams.toString()}`;
  };

  const ModelAxisTick = ({ x, y, payload, index }: any) => {
    const item =
      typeof index === "number"
        ? modelData[index]
        : modelData.find((entry) => entry.label === payload?.value);
    const label = truncateLabel(payload?.value, 24);

    if (!item) {
      return (
        <text x={x} y={y} dy={4} textAnchor="end" fill="currentColor">
          {label}
        </text>
      );
    }

    return (
      <a href={buildModelRecordsHref(item.modelId)}>
        <title>{item.label}</title>
        <text
          x={x}
          y={y}
          dy={4}
          textAnchor="end"
          fill="hsl(var(--primary))"
          className="cursor-pointer text-xs font-medium"
        >
          {label}
        </text>
      </a>
    );
  };

  const ModelTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-md shadow-lg bg-card p-2">
          <p className="font-semibold">{label}</p>
          <p className="text-muted-foreground">{item.modelId}</p>
          <p style={{ color: CHART_COLORS.credits }}>
            {t("consumedCredits")}: {item.consumedCredits}
          </p>
          <p>{t("generationCount")}: {item.generationCount}</p>
        </div>
      );
    }
    return null;
  };

  const ProviderTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-md shadow-lg bg-card p-2">
          <p className="font-semibold">{label}</p>
          <p style={{ color: CHART_COLORS.succeeded }}>
            {t("generationSucceeded")}: {item.succeededCount}
          </p>
          <p style={{ color: CHART_COLORS.failed }}>
            {t("generationFailed")}: {item.failedCount}
          </p>
          <p style={{ color: CHART_COLORS.credits }}>
            {t("consumedCredits")}: {item.consumedCredits}
          </p>
          <p>{t("successRate")}: {item.successRate}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("generationBreakdown")}</CardTitle>
          <CardDescription>{t("generationBreakdownDescription")}</CardDescription>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-fit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">{t("last1Day")}</SelectItem>
            <SelectItem value="7d">{t("last7Days")}</SelectItem>
            <SelectItem value="30d">{t("last30Days")}</SelectItem>
            <SelectItem value="90d">{t("last90Days")}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-5">
            <Skeleton className="h-[360px] w-full" />
            <Skeleton className="h-[360px] w-full" />
            <Skeleton className="h-[260px] w-full" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[360px]">
            <p className="text-red-500">{error.message}</p>
          </div>
        ) : modelData.length === 0 && providerData.length === 0 ? (
          <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
            {t("noGenerationData")}
          </div>
        ) : (
          <div className="space-y-6">
            {modelData.length > 0 ? (
              <div>
                <h3 className="mb-3 text-sm font-medium">
                  {t("modelCreditsTop")}
                </h3>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={modelData}
                    layout="vertical"
                    margin={{ left: 12, right: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis
                      dataKey="label"
                      type="category"
                      width={180}
                      tickFormatter={(value) => truncateLabel(value, 24)}
                      tick={<ModelAxisTick />}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ModelTooltip />} />
                    <Bar
                      dataKey="consumedCredits"
                      name={t("consumedCredits")}
                      fill={CHART_COLORS.credits}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            {providerData.length > 0 ? (
              <div>
                <h3 className="mb-3 text-sm font-medium">
                  {t("providerQualityTop")}
                </h3>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={providerData} margin={{ right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="provider"
                      tickFormatter={(value) => truncateLabel(value, 18)}
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
                    <Tooltip content={<ProviderTooltip />} />
                    <Legend />
                    <Bar
                      yAxisId="count"
                      dataKey="succeededCount"
                      name={t("generationSucceeded")}
                      fill={CHART_COLORS.succeeded}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="count"
                      dataKey="failedCount"
                      name={t("generationFailed")}
                      fill={CHART_COLORS.failed}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="credits"
                      dataKey="consumedCredits"
                      name={t("consumedCredits")}
                      fill={CHART_COLORS.credits}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-md border">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[96px_minmax(0,1fr)_120px_180px_140px] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <span>{t("type")}</span>
                  <span>{t("name")}</span>
                  <span>{t("consumedCredits")}</span>
                  <span>{t("summary")}</span>
                  <span>{t("records")}</span>
                </div>

                {modelData.map((item) => (
                  <div
                    key={`model-${item.modelId}`}
                    className="grid grid-cols-[96px_minmax(0,1fr)_120px_180px_140px] items-center gap-3 border-b px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{t("model")}</span>
                    <div className="min-w-0">
                      <a
                        href={buildModelRecordsHref(item.modelId)}
                        className="block truncate font-medium text-primary hover:underline underline-offset-4"
                        title={item.label}
                      >
                        {item.label}
                      </a>
                      <div className="truncate text-xs text-muted-foreground">
                        {item.modelId}
                      </div>
                    </div>
                    <span>{item.consumedCredits}</span>
                    <span className="text-muted-foreground">
                      {t("generationCount")}: {item.generationCount}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <a
                        href={buildModelRecordsHref(item.modelId)}
                        className="text-primary hover:underline underline-offset-4"
                      >
                        {t("allRecords")}
                      </a>
                      <a
                        href={buildModelRecordsHref(item.modelId, "succeeded")}
                        className="text-primary hover:underline underline-offset-4"
                      >
                        {t("succeededRecords")}
                      </a>
                      <a
                        href={buildModelRecordsHref(item.modelId, "failed")}
                        className="text-primary hover:underline underline-offset-4"
                      >
                        {t("failedRecords")}
                      </a>
                    </div>
                  </div>
                ))}

                {providerData.map((item) => (
                  <div
                    key={`provider-${item.provider}`}
                    className="grid grid-cols-[96px_minmax(0,1fr)_120px_180px_140px] items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0"
                  >
                    <span className="text-muted-foreground">Provider</span>
                    <a
                      href={buildProviderRecordsHref(item.provider)}
                      className="truncate font-medium text-primary hover:underline underline-offset-4"
                      title={item.provider}
                    >
                      {item.provider}
                    </a>
                    <span>{item.consumedCredits}</span>
                    <span className="text-muted-foreground">
                      {item.successRate}% · {item.succeededCount}/
                      {item.failedCount}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <a
                        href={buildProviderRecordsHref(item.provider)}
                        className="text-primary hover:underline underline-offset-4"
                      >
                        {t("allRecords")}
                      </a>
                      <a
                        href={buildProviderRecordsHref(item.provider, "succeeded")}
                        className="text-primary hover:underline underline-offset-4"
                      >
                        {t("succeededRecords")}
                      </a>
                      <a
                        href={buildProviderRecordsHref(item.provider, "failed")}
                        className="text-primary hover:underline underline-offset-4"
                      >
                        {t("failedRecords")}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
