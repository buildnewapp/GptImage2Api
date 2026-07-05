"use client";

import {
  getUserCreditReport,
  IUserCreditReportPeriod,
  IUserCreditReportRow,
} from "@/actions/overview";
import { Badge } from "@/components/ui/badge";
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
import useSWR from "swr";

const fetcher = async (
  period: IUserCreditReportPeriod,
): Promise<IUserCreditReportRow[]> => {
  const result = await getUserCreditReport(period);
  if (!result.success) {
    throw new Error(result.error || "Failed to load user credit report.");
  }
  return result.data ?? [];
};

const formatRatio = (value: number | null) => {
  if (value === null) {
    return "∞";
  }
  return value.toFixed(2);
};

export const UserCreditReport = () => {
  const t = useTranslations("Overview");
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? "en";
  const [period, setPeriod] = useState<IUserCreditReportPeriod>("7d");

  const { data, error, isLoading } = useSWR(
    ["user-credit-report", period],
    () => fetcher(period),
    {
      dedupingInterval: 300000,
    },
  );

  const rows = data ?? [];

  const buildCreditsHref = (userId: string) =>
    `/${locale}/dashboard/credits?userId=${encodeURIComponent(userId)}`;

  const buildGenerationsHref = (userId: string) =>
    `/${locale}/dashboard/ai-studio-admin?userId=${encodeURIComponent(userId)}`;

  const getRiskVariant = (riskLevel: IUserCreditReportRow["riskLevel"]) => {
    if (riskLevel === "high") {
      return "destructive";
    }
    if (riskLevel === "medium") {
      return "secondary";
    }
    return "outline";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("userCreditReport")}</CardTitle>
          <CardDescription>{t("userCreditReportDescription")}</CardDescription>
        </div>
        <Select
          value={period}
          onValueChange={(value) =>
            setPeriod(value as IUserCreditReportPeriod)
          }
        >
          <SelectTrigger className="w-fit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTime")}</SelectItem>
            <SelectItem value="1d">{t("last1Day")}</SelectItem>
            <SelectItem value="7d">{t("last7Days")}</SelectItem>
            <SelectItem value="30d">{t("last30Days")}</SelectItem>
            <SelectItem value="90d">{t("last90Days")}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[420px] w-full" />
        ) : error ? (
          <div className="flex h-[240px] items-center justify-center">
            <p className="text-red-500">{error.message}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            {t("noUserCreditData")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <div className="min-w-[1180px]">
              <div className="grid grid-cols-[minmax(220px,1fr)_90px_90px_90px_90px_90px_90px_90px_90px_110px] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>{t("user")}</span>
                <span>{t("purchasedCredits")}</span>
                <span>{t("consumedCredits")}</span>
                <span>{t("taskRewardCredits")}</span>
                <span>{t("freeCredits")}</span>
                <span>{t("freeToPurchaseRatio")}</span>
                <span>{t("currentCredits")}</span>
                <span>{t("netCredits")}</span>
                <span>{t("taskRewardClaims")}</span>
                <span>{t("risk")}</span>
              </div>

              {rows.map((row) => (
                <div
                  key={row.userId}
                  className="grid grid-cols-[minmax(220px,1fr)_90px_90px_90px_90px_90px_90px_90px_90px_110px] items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0"
                >
                  <div className="min-w-0">
                    <a
                      href={buildCreditsHref(row.userId)}
                      className="block truncate font-medium text-primary hover:underline underline-offset-4"
                      title={row.email ?? row.userId}
                    >
                      {row.email ?? row.name ?? row.userId}
                    </a>
                    <div className="truncate text-xs text-muted-foreground">
                      {row.name ? `${row.name} · ` : ""}
                      {new Date(row.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span>{row.purchasedCredits}</span>
                  <a
                    href={buildGenerationsHref(row.userId)}
                    className="text-primary hover:underline underline-offset-4"
                  >
                    {row.consumedCredits}
                  </a>
                  <span>{row.taskRewardCredits}</span>
                  <span>{row.freeCredits}</span>
                  <span>{formatRatio(row.freeToPurchasedRatio)}</span>
                  <span>{row.currentCredits}</span>
                  <span>{row.netCredits}</span>
                  <span>{row.taskRewardClaims}</span>
                  <Badge variant={getRiskVariant(row.riskLevel)}>
                    {t(`risk_${row.riskLevel}`)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
