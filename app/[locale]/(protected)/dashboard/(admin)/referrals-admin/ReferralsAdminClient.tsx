"use client";

import {
  getReferralAdminInvites,
  getReferralAdminOverview,
  getReferralAdminRewards,
  getReferralAdminWithdrawals,
  markReferralWithdrawalPaidAction,
  rejectReferralWithdrawalAction,
  type ReferralAdminInviteRow,
  type ReferralAdminListResult,
  type ReferralAdminRewardRow,
  type ReferralAdminSummaryData,
  type ReferralAdminWithdrawalRow,
} from "@/actions/referrals/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_ADMIN_LIST_PAGE_SIZE,
  REFERRAL_ADMIN_INVITE_STATUSES,
  REFERRAL_ADMIN_PAGE_SIZE_OPTIONS,
  REFERRAL_ADMIN_REWARD_STATUSES,
  REFERRAL_ADMIN_REWARD_TYPES,
  REFERRAL_ADMIN_WITHDRAW_STATUSES,
} from "@/lib/referrals/admin-lists";
import dayjs from "dayjs";
import { DollarSign, Gift, Loader2, RefreshCw, Users, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { startTransition, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

type ReferralAdminTab = "overview" | "invites" | "rewards" | "withdrawals";

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const formatEnumLabel = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDateTime = (value: string | null) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";

function getRangeLabel(totalCount: number, pageIndex: number, pageSize: number) {
  if (totalCount === 0) {
    return "0-0";
  }

  const start = pageIndex * pageSize + 1;
  const end = Math.min(totalCount, (pageIndex + 1) * pageSize);
  return `${start}-${end}`;
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 pt-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <div className="rounded-full bg-muted p-3 text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

function ReferralOverviewTab({ summary }: { summary: ReferralAdminSummaryData }) {
  const t = useTranslations("AdminReferrals");

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <SummaryCard
        icon={<Users className="h-4 w-4" />}
        label={t("summary.invited")}
        value={String(summary.invitedCount)}
      />
      <SummaryCard
        icon={<Gift className="h-4 w-4" />}
        label={t("summary.credits")}
        value={String(summary.signupCreditsEarned)}
      />
      <SummaryCard
        icon={<DollarSign className="h-4 w-4" />}
        label={t("summary.lockedCash")}
        value={formatMoney(summary.lockedCashUsd)}
      />
      <SummaryCard
        icon={<Wallet className="h-4 w-4" />}
        label={t("summary.claimableCash")}
        value={formatMoney(summary.claimableCashUsd)}
      />
      <SummaryCard
        icon={<Wallet className="h-4 w-4" />}
        label={t("summary.pendingWithdraw")}
        value={formatMoney(summary.pendingWithdrawCashUsd)}
      />
      <SummaryCard
        icon={<DollarSign className="h-4 w-4" />}
        label={t("summary.paidCash")}
        value={formatMoney(summary.paidCashUsd)}
      />
    </div>
  );
}

function TablePagination({
  totalCount,
  pageIndex,
  pageSize,
  isLoading,
  onPageSizeChange,
  onPrevious,
  onNext,
}: {
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
  onPageSizeChange: (value: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("AdminReferrals");
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {t("pagination.summary", {
          range: getRangeLabel(totalCount, pageIndex, pageSize),
          total: totalCount,
          page: pageIndex + 1,
          pages: totalPages,
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REFERRAL_ADMIN_PAGE_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {t("pagination.pageSizeOption", { count: option })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          disabled={pageIndex === 0 || isLoading}
          onClick={onPrevious}
        >
          {t("pagination.previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={(pageIndex + 1) * pageSize >= totalCount || isLoading}
          onClick={onNext}
        >
          {t("pagination.next")}
        </Button>
      </div>
    </div>
  );
}

function InvitesTab({ active }: { active: boolean }) {
  const t = useTranslations("AdminReferrals");
  const [rows, setRows] = useState<ReferralAdminInviteRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_ADMIN_LIST_PAGE_SIZE);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [debouncedQuery] = useDebounce(query, 400);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedQuery, status, pageSize]);

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const result = await getReferralAdminInvites({
        pageIndex,
        pageSize,
        query: debouncedQuery,
        status,
      });

      if (cancelled) {
        return;
      }

      if (!result.success || !result.data) {
        toast.error(result.success ? t("errors.loadData") : result.error);
        setRows([]);
        setTotalCount(0);
        setIsLoading(false);
        return;
      }

      setRows(result.data.rows);
      setTotalCount(result.data.totalCount);
      setIsLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [active, debouncedQuery, pageIndex, pageSize, reloadToken, status, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("invites.title")}</CardTitle>
        <CardDescription>{t("invites.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("filters.invitesPlaceholder")}
              className="md:max-w-sm"
            />
            <Select
              value={status || "all"}
              onValueChange={(value) => setStatus(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder={t("filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
                {REFERRAL_ADMIN_INVITE_STATUSES.map((statusOption) => (
                  <SelectItem key={statusOption} value={statusOption}>
                    {formatEnumLabel(statusOption)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => setReloadToken((value) => value + 1)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("actions.refresh")}
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-md border">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("invites.columns.inviter")}</TableHead>
                <TableHead>{t("invites.columns.invitee")}</TableHead>
                <TableHead>{t("invites.columns.code")}</TableHead>
                <TableHead>{t("invites.columns.status")}</TableHead>
                <TableHead>{t("invites.columns.registeredAt")}</TableHead>
                <TableHead>{t("invites.columns.qualifiedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {isLoading ? t("table.loading") : t("invites.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.inviterEmail}</TableCell>
                    <TableCell>{row.inviteeEmail}</TableCell>
                    <TableCell className="font-mono text-xs">{row.inviteCode ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatEnumLabel(row.status)}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(row.registeredAt)}</TableCell>
                    <TableCell>{formatDateTime(row.qualifiedAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          totalCount={totalCount}
          pageIndex={pageIndex}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageSizeChange={setPageSize}
          onPrevious={() => setPageIndex((value) => Math.max(0, value - 1))}
          onNext={() => setPageIndex((value) => value + 1)}
        />
      </CardContent>
    </Card>
  );
}

function RewardsTab({ active }: { active: boolean }) {
  const t = useTranslations("AdminReferrals");
  const [rows, setRows] = useState<ReferralAdminRewardRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_ADMIN_LIST_PAGE_SIZE);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [rewardType, setRewardType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [debouncedQuery] = useDebounce(query, 400);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedQuery, pageSize, rewardType, status]);

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const result = await getReferralAdminRewards({
        pageIndex,
        pageSize,
        query: debouncedQuery,
        status,
        rewardType,
      });

      if (cancelled) {
        return;
      }

      if (!result.success || !result.data) {
        toast.error(result.success ? t("errors.loadData") : result.error);
        setRows([]);
        setTotalCount(0);
        setIsLoading(false);
        return;
      }

      setRows(result.data.rows);
      setTotalCount(result.data.totalCount);
      setIsLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [active, debouncedQuery, pageIndex, pageSize, reloadToken, rewardType, status, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("rewards.title")}</CardTitle>
        <CardDescription>{t("rewards.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 xl:flex-row">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("filters.rewardsPlaceholder")}
              className="xl:max-w-sm"
            />
            <Select
              value={rewardType || "all"}
              onValueChange={(value) => setRewardType(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-full xl:w-[220px]">
                <SelectValue placeholder={t("filters.rewardType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allRewardTypes")}</SelectItem>
                {REFERRAL_ADMIN_REWARD_TYPES.map((rewardTypeOption) => (
                  <SelectItem key={rewardTypeOption} value={rewardTypeOption}>
                    {formatEnumLabel(rewardTypeOption)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status || "all"}
              onValueChange={(value) => setStatus(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-full xl:w-[220px]">
                <SelectValue placeholder={t("filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
                {REFERRAL_ADMIN_REWARD_STATUSES.map((statusOption) => (
                  <SelectItem key={statusOption} value={statusOption}>
                    {formatEnumLabel(statusOption)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => setReloadToken((value) => value + 1)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("actions.refresh")}
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-md border">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("rewards.columns.inviter")}</TableHead>
                <TableHead>{t("rewards.columns.invitee")}</TableHead>
                <TableHead>{t("rewards.columns.type")}</TableHead>
                <TableHead>{t("rewards.columns.value")}</TableHead>
                <TableHead>{t("rewards.columns.status")}</TableHead>
                <TableHead>{t("rewards.columns.createdAt")}</TableHead>
                <TableHead>{t("rewards.columns.availableAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {isLoading ? t("table.loading") : t("rewards.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.inviterEmail}</TableCell>
                    <TableCell>{row.inviteeEmail}</TableCell>
                    <TableCell>{formatEnumLabel(row.rewardType)}</TableCell>
                    <TableCell>
                      {row.creditAmount !== null
                        ? `+${row.creditAmount}`
                        : row.cashAmountUsd !== null
                          ? formatMoney(row.cashAmountUsd)
                          : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatEnumLabel(row.status)}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell>{formatDateTime(row.availableAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          totalCount={totalCount}
          pageIndex={pageIndex}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageSizeChange={setPageSize}
          onPrevious={() => setPageIndex((value) => Math.max(0, value - 1))}
          onNext={() => setPageIndex((value) => value + 1)}
        />
      </CardContent>
    </Card>
  );
}

function WithdrawalsTab({
  active,
  onOverviewChanged,
}: {
  active: boolean;
  onOverviewChanged: () => Promise<void>;
}) {
  const t = useTranslations("AdminReferrals");
  const [rows, setRows] = useState<ReferralAdminWithdrawalRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_ADMIN_LIST_PAGE_SIZE);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [debouncedQuery] = useDebounce(query, 400);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedQuery, pageSize, status]);

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const result = await getReferralAdminWithdrawals({
        pageIndex,
        pageSize,
        query: debouncedQuery,
        status,
      });

      if (cancelled) {
        return;
      }

      if (!result.success || !result.data) {
        toast.error(result.success ? t("errors.loadData") : result.error);
        setRows([]);
        setTotalCount(0);
        setIsLoading(false);
        return;
      }

      setRows(result.data.rows);
      setTotalCount(result.data.totalCount);
      setIsLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [active, debouncedQuery, pageIndex, pageSize, reloadToken, status, t]);

  const handleProcessWithdrawal = async (
    requestId: string,
    action: "paid" | "rejected"
  ) => {
    setProcessingRequestId(requestId);
    const result =
      action === "paid"
        ? await markReferralWithdrawalPaidAction(requestId)
        : await rejectReferralWithdrawalAction(requestId);
    setProcessingRequestId(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(
      action === "paid" ? t("toasts.markPaidSuccess") : t("toasts.rejectSuccess")
    );
    await onOverviewChanged();
    startTransition(() => {
      setReloadToken((value) => value + 1);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("withdrawals.title")}</CardTitle>
        <CardDescription>{t("withdrawals.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("filters.withdrawalsPlaceholder")}
              className="md:max-w-sm"
            />
            <Select
              value={status || "all"}
              onValueChange={(value) => setStatus(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder={t("filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
                {REFERRAL_ADMIN_WITHDRAW_STATUSES.map((statusOption) => (
                  <SelectItem key={statusOption} value={statusOption}>
                    {formatEnumLabel(statusOption)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => setReloadToken((value) => value + 1)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("actions.refresh")}
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-md border">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("withdrawals.columns.user")}</TableHead>
                <TableHead>{t("withdrawals.columns.amount")}</TableHead>
                <TableHead>{t("withdrawals.columns.status")}</TableHead>
                <TableHead>{t("withdrawals.columns.requestedAt")}</TableHead>
                <TableHead>{t("withdrawals.columns.processedAt")}</TableHead>
                <TableHead>{t("withdrawals.columns.notes")}</TableHead>
                <TableHead className="text-right">{t("withdrawals.columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {isLoading ? t("table.loading") : t("withdrawals.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const isPending = row.status === "pending";
                  const isProcessing = processingRequestId === row.id;

                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.requesterEmail}</TableCell>
                      <TableCell>{formatMoney(row.amountUsd)}</TableCell>
                      <TableCell>
                        <Badge variant={isPending ? "outline" : "secondary"}>
                          {formatEnumLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(row.requestedAt)}</TableCell>
                      <TableCell>{formatDateTime(row.processedAt)}</TableCell>
                      <TableCell>{row.notes ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={!isPending || isProcessing}
                            onClick={() => handleProcessWithdrawal(row.id, "paid")}
                          >
                            {t("withdrawals.actions.markPaid")}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={!isPending || isProcessing}
                            onClick={() => handleProcessWithdrawal(row.id, "rejected")}
                          >
                            {t("withdrawals.actions.reject")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          totalCount={totalCount}
          pageIndex={pageIndex}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageSizeChange={setPageSize}
          onPrevious={() => setPageIndex((value) => Math.max(0, value - 1))}
          onNext={() => setPageIndex((value) => value + 1)}
        />
      </CardContent>
    </Card>
  );
}

export default function ReferralsAdminClient({
  initialOverview,
}: {
  initialOverview: ReferralAdminSummaryData;
}) {
  const t = useTranslations("AdminReferrals");
  const [activeTab, setActiveTab] = useState<ReferralAdminTab>("overview");
  const [overview, setOverview] = useState(initialOverview);
  const [isRefreshingOverview, setIsRefreshingOverview] = useState(false);

  const refreshOverview = async () => {
    setIsRefreshingOverview(true);
    const result = await getReferralAdminOverview();
    setIsRefreshingOverview(false);

    if (!result.success || !result.data) {
      toast.error(result.success ? t("errors.loadOverview") : result.error);
      return;
    }

    setOverview(result.data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button variant="outline" disabled={isRefreshingOverview} onClick={refreshOverview}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("actions.refreshOverview")}
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ReferralAdminTab)}
        className="space-y-4"
      >
        <TabsList className="grid h-auto grid-cols-2 gap-2 md:grid-cols-4">
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="invites">{t("tabs.invites")}</TabsTrigger>
          <TabsTrigger value="rewards">{t("tabs.rewards")}</TabsTrigger>
          <TabsTrigger value="withdrawals">{t("tabs.withdrawals")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" forceMount hidden={activeTab !== "overview"}>
          <ReferralOverviewTab summary={overview} />
        </TabsContent>
        <TabsContent value="invites" forceMount hidden={activeTab !== "invites"}>
          <InvitesTab active={activeTab === "invites"} />
        </TabsContent>
        <TabsContent value="rewards" forceMount hidden={activeTab !== "rewards"}>
          <RewardsTab active={activeTab === "rewards"} />
        </TabsContent>
        <TabsContent
          value="withdrawals"
          forceMount
          hidden={activeTab !== "withdrawals"}
        >
          <WithdrawalsTab
            active={activeTab === "withdrawals"}
            onOverviewChanged={refreshOverview}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
