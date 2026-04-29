import { getUserBenefits } from "@/actions/usage/benefits";
import { getCreditLogs } from "@/actions/usage/logs";
import { getSession } from "@/lib/auth/server";
import { settleExpiredSubscriptionCreditsForUser } from "@/lib/payments/credit-manager";
import { buildCreditHistorySummaryItems } from "@/lib/usage/credit-history-summary";
import { Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CreditHistoryDataTable } from "./CreditHistoryDataTable";
import { CreditHistorySummaryCards } from "./CreditHistorySummaryCards";

const PAGE_SIZE = 20;

export default async function CreditHistoryPage() {
  const t = await getTranslations("CreditHistory");
  const session = await getSession();
  const user = session?.user;

  /*
  过期积分 导入creditLogsSchema表，这样用户积分流水可以对账成功
  暂时不用，防止用户看到投诉
  if (user) {
    await settleExpiredSubscriptionCreditsForUser(user.id);
  }
  */

  const [initialResult, benefits] = await Promise.all([
    getCreditLogs({
      pageIndex: 0,
      pageSize: PAGE_SIZE,
    }),
    user ? getUserBenefits(user.id) : null,
  ]);

  const summaryItems = benefits
    ? buildCreditHistorySummaryItems(benefits)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      {summaryItems ? (
        <CreditHistorySummaryCards items={summaryItems} t={t} />
      ) : null}
      {initialResult.success && initialResult.data ? (
        <Suspense
          fallback={
            <div className="flex items-center justify-center rounded-md border">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          }
        >
          <CreditHistoryDataTable
            initialData={initialResult.data.logs}
            initialTotalCount={initialResult.data.count}
            pageSize={PAGE_SIZE}
          />
        </Suspense>
      ) : (
        <p className="text-destructive">
          {initialResult.error || t("load_error")}
        </p>
      )}
    </div>
  );
}
