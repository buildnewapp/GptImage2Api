"use client";

import {
  getUserConsumptionRanking,
  IUserConsumptionRankingPeriod,
  IUserConsumptionRankingRow,
} from "@/actions/overview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useOverviewPeriod } from "./OverviewPeriod";

const fetcher = async (
  period: IUserConsumptionRankingPeriod,
): Promise<IUserConsumptionRankingRow[]> => {
  const result = await getUserConsumptionRanking(period);
  if (!result.success) {
    throw new Error(result.error || "Failed to load user consumption ranking.");
  }
  return result.data ?? [];
};

export const UserConsumptionRanking = () => {
  const t = useTranslations("Overview");
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? "en";
  const period = useOverviewPeriod();

  const { data, error, isLoading } = useSWR(
    ["user-consumption-ranking", period],
    () => fetcher(period),
    { dedupingInterval: 300000 },
  );

  const rows = data ?? [];
  const maxCredits = rows[0]?.consumedCredits ?? 0;

  const buildGenerationsHref = (userId: string) =>
    `/${locale}/dashboard/ai-studio-admin?userId=${encodeURIComponent(userId)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("userConsumptionRanking")}</CardTitle>
        <CardDescription>
          {t("userConsumptionRankingDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-red-500">{error.message}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            {t("noUserConsumptionData")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <div className="grid grid-cols-[3rem_minmax(0,1fr)_auto] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              <span>{t("rank")}</span>
              <span>{t("user")}</span>
              <span className="text-right">{t("consumedCredits")}</span>
            </div>
            {rows.map((row, index) => {
              const percentage = maxCredits
                ? (row.consumedCredits / maxCredits) * 100
                : 0;

              return (
                <div
                  key={row.userId}
                  className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <a
                      href={buildGenerationsHref(row.userId)}
                      className="block truncate text-sm font-medium text-primary underline-offset-4 hover:underline"
                      title={row.email ?? row.name ?? row.userId}
                    >
                      {row.email ?? row.name ?? row.userId}
                    </a>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary transition-[width] duration-200"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {row.consumedCredits}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("generationCount")}: {row.generationCount}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
