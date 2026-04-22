"use client";

import {
  createReferralWithdrawalRequestAction,
  saveReferralInviteCodeAction,
  type ReferralDashboardData,
} from "@/actions/referrals/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import dayjs from "dayjs";
import { Coins, Copy, DollarSign, Gift, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { toast } from "sonner";

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

const getInviteStatusLabel = (status: string, t: (key: string) => string) => {
  switch (status) {
    case "registered":
      return t("statuses.registered");
    case "qualified_first_order":
      return t("statuses.qualifiedFirstOrder");
    case "expired":
      return t("statuses.expired");
    case "rewarded":
      return t("statuses.rewarded");
    default:
      return status;
  }
};

const getRewardTypeLabel = (type: string, t: (key: string) => string) => {
  switch (type) {
    case "signup_credit":
      return t("rewardTypes.signupCredit");
    case "first_order_cash":
      return t("rewardTypes.firstOrderCash");
    default:
      return type;
  }
};

const getRewardStatusLabel = (status: string, t: (key: string) => string) => {
  switch (status) {
    case "granted":
      return t("rewardStatuses.granted");
    case "locked":
      return t("rewardStatuses.locked");
    case "claimable":
      return t("rewardStatuses.claimable");
    case "pending_withdraw":
      return t("rewardStatuses.pendingWithdraw");
    case "paid":
      return t("rewardStatuses.paid");
    case "revoked":
      return t("rewardStatuses.revoked");
    case "rejected":
      return t("rewardStatuses.rejected");
    default:
      return status;
  }
};

export default function ReferralsClient({ data }: { data: ReferralDashboardData }) {
  const t = useTranslations("DashboardUserReferrals");
  const router = useRouter();
  const [inviteCodeInput, setInviteCodeInput] = useState(data.inviteCode ?? "");
  const [isSavingInviteCode, setIsSavingInviteCode] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const refresh = () => startTransition(() => router.refresh());

  const copyText = async (value: string | null, successMessage: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  };

  const handleSaveInviteCode = async () => {
    setIsSavingInviteCode(true);
    const result = await saveReferralInviteCodeAction(inviteCodeInput);
    setIsSavingInviteCode(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(t("toast.codeSaved"));
    refresh();
  };

  const handleWithdrawalRequest = async () => {
    setIsApplying(true);
    const result = await createReferralWithdrawalRequestAction();
    setIsApplying(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(result.data?.message || t("toast.withdrawRequested"));
    refresh();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("inviteCard.title")}</CardTitle>
          <CardDescription>{t("inviteCard.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">{t("inviteCard.codeLabel")}</div>
              <input
                value={inviteCodeInput}
                onChange={(event) => setInviteCodeInput(event.target.value.toUpperCase())}
                placeholder={t("inviteCard.inputPlaceholder")}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                disabled={
                  isSavingInviteCode ||
                  (!!data.inviteCode && data.remainingInviteCodeChanges <= 0)
                }
              />
              <p className="text-xs text-muted-foreground">
                {!data.inviteCode
                  ? t("inviteCard.firstSetHint")
                  : data.remainingInviteCodeChanges > 0
                    ? t("inviteCard.oneChangeRemaining")
                    : t("inviteCard.noChangesRemaining")}
              </p>
            </div>
            <MetricCard label={t("inviteCard.linkLabel")} value={data.inviteLink || t("inviteCard.noLink")} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSaveInviteCode}
              disabled={
                isSavingInviteCode ||
                inviteCodeInput.trim().length === 0 ||
                (!!data.inviteCode && data.remainingInviteCodeChanges <= 0)
              }
            >
              <Gift className="mr-2 h-4 w-4" />
              {data.inviteCode ? t("inviteCard.update") : t("inviteCard.save")}
            </Button>
            <Button variant="outline" onClick={() => copyText(data.inviteLink, t("toast.linkCopied"))} disabled={!data.inviteLink}>
              <Copy className="mr-2 h-4 w-4" />
              {t("inviteCard.copyLink")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Users className="h-4 w-4" />} label={t("summary.invited")} value={String(data.summary.invitedCount)} />
        <SummaryCard icon={<Coins className="h-4 w-4" />} label={t("summary.credits")} value={String(data.summary.signupCreditsEarned)} />
        <SummaryCard icon={<DollarSign className="h-4 w-4" />} label={t("summary.lockedCash")} value={formatMoney(data.summary.lockedCashUsd)} />
        <SummaryCard icon={<DollarSign className="h-4 w-4" />} label={t("summary.claimableCash")} value={formatMoney(data.summary.claimableCashUsd)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("withdraw.title")}</CardTitle>
          <CardDescription>{t("withdraw.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label={t("withdraw.claimable")} value={formatMoney(data.summary.claimableCashUsd)} />
            <MetricCard label={t("withdraw.pending")} value={formatMoney(data.summary.pendingWithdrawCashUsd)} />
            <MetricCard label={t("withdraw.paid")} value={formatMoney(data.summary.paidCashUsd)} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleWithdrawalRequest} disabled={isApplying || data.summary.claimableCashUsd <= 0}>
              {t("withdraw.apply")}
            </Button>
            <p className="text-sm text-muted-foreground">{t("withdraw.notice")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("invites.title")}</CardTitle>
          <CardDescription>{t("invites.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("invites.columns.user")}</TableHead>
                <TableHead>{t("invites.columns.status")}</TableHead>
                <TableHead>{t("invites.columns.registeredAt")}</TableHead>
                <TableHead>{t("invites.columns.qualifiedAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.invites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">{t("invites.empty")}</TableCell>
                </TableRow>
              ) : (
                data.invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.inviteeName || invite.inviteeEmail}</TableCell>
                    <TableCell><Badge variant="outline">{getInviteStatusLabel(invite.status, t)}</Badge></TableCell>
                    <TableCell>{dayjs(invite.registeredAt).format("YYYY-MM-DD HH:mm")}</TableCell>
                    <TableCell>{invite.qualifiedAt ? dayjs(invite.qualifiedAt).format("YYYY-MM-DD HH:mm") : "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("rewards.title")}</CardTitle>
          <CardDescription>{t("rewards.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("rewards.columns.user")}</TableHead>
                <TableHead>{t("rewards.columns.type")}</TableHead>
                <TableHead>{t("rewards.columns.value")}</TableHead>
                <TableHead>{t("rewards.columns.status")}</TableHead>
                <TableHead>{t("rewards.columns.availableAt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rewards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">{t("rewards.empty")}</TableCell>
                </TableRow>
              ) : (
                data.rewards.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell>{reward.inviteeEmail}</TableCell>
                    <TableCell><Badge variant="outline">{getRewardTypeLabel(reward.rewardType, t)}</Badge></TableCell>
                    <TableCell>{reward.creditAmount !== null ? `+${reward.creditAmount}` : reward.cashAmountUsd !== null ? formatMoney(reward.cashAmountUsd) : "-"}</TableCell>
                    <TableCell><Badge variant="secondary">{getRewardStatusLabel(reward.status, t)}</Badge></TableCell>
                    <TableCell>{reward.availableAt ? dayjs(reward.availableAt).format("YYYY-MM-DD HH:mm") : "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 break-all text-xl font-semibold">{value}</div>
    </div>
  );
}
