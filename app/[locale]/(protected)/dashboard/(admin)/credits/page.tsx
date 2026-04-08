import { getAdminCreditHistory } from "@/actions/usage/admin";
import { buildAdminUserScopeLabel } from "@/lib/admin/dashboard-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Coins, Layers3, WalletCards } from "lucide-react";
import { AdminCreditHistoryDataTable } from "./AdminCreditHistoryDataTable";

const PAGE_SIZE = 20;

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
        <div className="rounded-full border p-2 text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

export default async function AdminCreditsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ userId?: string }>;
}) {
  const { locale } = await params;
  const { userId } = await searchParams;

  const result = await getAdminCreditHistory({
    userId,
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  if (!result.success || !result.data) {
    return (
      <p className="text-destructive">
        {("error" in result && result.error) || "Failed to load credit history."}
      </p>
    );
  }

  const userLabel = result.data.user ? buildAdminUserScopeLabel(result.data.user) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {userId ? "用户积分流水" : "全部积分流水"}
          </h1>
          {userLabel ? <p className="text-muted-foreground">{userLabel}</p> : null}
          {result.data.user ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground">{result.data.user.id}</p>
          ) : (
            <p className="text-muted-foreground">查看所有用户的积分流水记录</p>
          )}
        </div>
        <div className="flex gap-2">
          {userId ? (
            <Button asChild variant="outline">
              <Link href={`/${locale}/dashboard/credits`}>查看全部记录</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href={`/${locale}/dashboard/users`}>返回用户列表</Link>
          </Button>
        </div>
      </div>

      {result.data.summary ? (
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="当前总积分"
            value={result.data.summary.totalCredits}
            icon={<Coins className="h-4 w-4" />}
          />
          <SummaryCard
            label="订阅积分"
            value={result.data.summary.subscriptionCreditsBalance}
            icon={<Layers3 className="h-4 w-4" />}
          />
          <SummaryCard
            label="一次性积分"
            value={result.data.summary.oneTimeCreditsBalance}
            icon={<WalletCards className="h-4 w-4" />}
          />
        </div>
      ) : null}

      <AdminCreditHistoryDataTable
        userId={userId}
        initialData={result.data.logs}
        initialTotalCount={result.data.count}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
