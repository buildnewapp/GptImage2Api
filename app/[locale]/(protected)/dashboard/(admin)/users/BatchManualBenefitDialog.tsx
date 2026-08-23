"use client";

import {
  findManualBenefitRecipient,
  grantManualUserBenefitsBatch,
  type AdminManualBenefitPlan,
  type AdminManualBenefitRecipient,
} from "@/actions/users/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  getManualBenefitPeriodEnd,
  getManualCreditDefaultsFromPlan,
  isRecurringManualBenefitPlan,
  type ManualCreditType,
} from "@/lib/admin/dashboard-users";
import dayjs from "dayjs";
import { Gift, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

const MAX_BATCH_RECIPIENTS = 100;

function formatDateTimeLocal(value: Date) {
  return dayjs(value).format("YYYY-MM-DDTHH:mm");
}

function toIsoDateTime(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function BatchManualBenefitDialog({
  plans,
}: {
  plans: AdminManualBenefitPlan[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("none");
  const [subscriptionEnd, setSubscriptionEnd] = useState("");
  const [creditType, setCreditType] = useState<ManualCreditType>("none");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditExpiresAt, setCreditExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipients, setRecipients] = useState<AdminManualBenefitRecipient[]>(
    [],
  );
  const [isChecking, startChecking] = useTransition();
  const [isPending, startSubmitting] = useTransition();
  const router = useRouter();

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const isRecurringPlan = selectedPlan
    ? isRecurringManualBenefitPlan(selectedPlan)
    : false;

  function resetForm() {
    setSelectedPlanId("none");
    setSubscriptionEnd("");
    setCreditType("none");
    setCreditAmount("");
    setCreditExpiresAt("");
    setNotes("");
    setRecipientEmail("");
    setRecipients([]);
  }

  function applyPlanDefaults(planId: string) {
    setSelectedPlanId(planId);

    if (planId === "none") {
      setSubscriptionEnd("");
      return;
    }

    const plan = plans.find((item) => item.id === planId);
    if (!plan) {
      return;
    }

    const creditDefaults = getManualCreditDefaultsFromPlan(plan);
    setCreditType(creditDefaults.creditType);
    setCreditAmount(
      creditDefaults.amount > 0 ? String(creditDefaults.amount) : "",
    );

    if (isRecurringManualBenefitPlan(plan)) {
      const defaultEndValue = formatDateTimeLocal(
        getManualBenefitPeriodEnd(plan),
      );
      setSubscriptionEnd(defaultEndValue);
      setCreditExpiresAt(
        creditDefaults.creditType === "subscription" ? defaultEndValue : "",
      );
    } else {
      setSubscriptionEnd("");
      setCreditExpiresAt("");
    }
  }

  function updateCreditType(value: ManualCreditType) {
    setCreditType(value);
    if (value === "subscription" && !creditExpiresAt) {
      setCreditExpiresAt(
        subscriptionEnd || formatDateTimeLocal(getManualBenefitPeriodEnd({})),
      );
    }
    if (value !== "subscription") {
      setCreditExpiresAt("");
    }
  }

  function addRecipient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = recipientEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("请输入用户邮箱");
      return;
    }
    if (
      recipients.some(
        (recipient) => recipient.email.toLowerCase() === normalizedEmail,
      )
    ) {
      toast.error("该用户已在待发放列表中");
      return;
    }
    if (recipients.length >= MAX_BATCH_RECIPIENTS) {
      toast.error(`单次最多添加 ${MAX_BATCH_RECIPIENTS} 位用户`);
      return;
    }

    startChecking(async () => {
      const result = await findManualBenefitRecipient({
        email: normalizedEmail,
      });

      if (!result.success || !result.data) {
        toast.error("无法添加用户", {
          description: result.success ? "未找到用户信息。" : result.error,
        });
        return;
      }

      const recipient = result.data;
      setRecipients((current) =>
        current.some((item) => item.id === recipient.id)
          ? current
          : [...current, recipient],
      );
      setRecipientEmail("");
    });
  }

  function submit() {
    const amount = Number(creditAmount || 0);

    if (recipients.length === 0) {
      toast.error("请先添加至少一位已注册用户");
      return;
    }
    if (selectedPlanId === "none" && creditType === "none") {
      toast.error("请选择产品或填写积分");
      return;
    }
    if (isRecurringPlan && !subscriptionEnd) {
      toast.error("请填写会员结束时间");
      return;
    }
    if (creditType !== "none" && (!Number.isFinite(amount) || amount <= 0)) {
      toast.error("请填写有效的积分数量");
      return;
    }
    if (creditType === "subscription" && !creditExpiresAt) {
      toast.error("请填写订阅积分结束时间");
      return;
    }

    startSubmitting(async () => {
      const result = await grantManualUserBenefitsBatch({
        userIds: recipients.map((recipient) => recipient.id),
        planId: selectedPlanId !== "none" ? selectedPlanId : null,
        subscriptionPeriodEnd: isRecurringPlan
          ? toIsoDateTime(subscriptionEnd)
          : null,
        creditType,
        creditAmount: amount,
        creditExpiresAt:
          creditType === "subscription" ? toIsoDateTime(creditExpiresAt) : null,
        notes: notes || undefined,
      });

      if (!result.success || !result.data) {
        toast.error("批量添加权益失败", {
          description: result.success ? "未返回发放结果。" : result.error,
        });
        return;
      }

      const { succeededUserIds, failures } = result.data;
      router.refresh();

      if (failures.length === 0) {
        toast.success(`已为 ${succeededUserIds.length} 位用户添加权益`);
        resetForm();
        setOpen(false);
        return;
      }

      const failedUserIds = new Set(failures.map((failure) => failure.userId));
      setRecipients((current) =>
        current.filter((recipient) => failedUserIds.has(recipient.id)),
      );
      toast.error(
        `已成功 ${succeededUserIds.length} 位，失败 ${failures.length} 位`,
        {
          description: failures[0]?.error,
        },
      );
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isPending || isChecking) {
          return;
        }
        if (!nextOpen) {
          resetForm();
        }
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button className="cursor-pointer gap-1.5">
          <Gift className="h-4 w-4" />
          批量添加权益
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>批量添加权益</DialogTitle>
          <DialogDescription>
            设置统一的产品或积分权益，再添加需要发放的已注册用户。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>产品</Label>
            <Select value={selectedPlanId} onValueChange={applyPlanDefaults}>
              <SelectTrigger>
                <SelectValue placeholder="不选择产品" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不选择产品</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.cardTitle}
                    {plan.displayPrice ? ` · ${plan.displayPrice}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isRecurringPlan ? (
            <div className="space-y-2">
              <Label htmlFor="batch-benefit-subscription-end">
                会员结束时间
              </Label>
              <Input
                id="batch-benefit-subscription-end"
                type="datetime-local"
                value={subscriptionEnd}
                onChange={(event) => {
                  setSubscriptionEnd(event.target.value);
                  if (creditType === "subscription") {
                    setCreditExpiresAt(event.target.value);
                  }
                }}
              />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <div className="space-y-2">
              <Label>积分类型</Label>
              <Select
                value={creditType}
                onValueChange={(value) =>
                  updateCreditType(value as ManualCreditType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不添加积分</SelectItem>
                  <SelectItem value="one_time">一次性积分</SelectItem>
                  <SelectItem value="subscription">订阅积分</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-benefit-credit-amount">数量</Label>
              <Input
                id="batch-benefit-credit-amount"
                type="number"
                min={0}
                step={1}
                value={creditAmount}
                disabled={creditType === "none"}
                onChange={(event) => setCreditAmount(event.target.value)}
              />
            </div>
          </div>

          {creditType === "subscription" ? (
            <div className="space-y-2">
              <Label htmlFor="batch-benefit-credit-end">订阅积分结束时间</Label>
              <Input
                id="batch-benefit-credit-end"
                type="datetime-local"
                value={creditExpiresAt}
                onChange={(event) => setCreditExpiresAt(event.target.value)}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="batch-benefit-notes">备注</Label>
            <Textarea
              id="batch-benefit-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="例如：活动奖励、人工补偿、线下付款"
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="batch-benefit-user-email">用户邮箱</Label>
              <span className="text-xs text-muted-foreground">
                {recipients.length} / {MAX_BATCH_RECIPIENTS}
              </span>
            </div>
            <form className="flex gap-2" onSubmit={addRecipient}>
              <Input
                id="batch-benefit-user-email"
                type="email"
                autoComplete="off"
                placeholder="user@example.com"
                value={recipientEmail}
                disabled={isChecking || isPending}
                onChange={(event) => setRecipientEmail(event.target.value)}
              />
              <Button
                type="submit"
                variant="outline"
                className="cursor-pointer"
                disabled={isChecking || isPending || !recipientEmail.trim()}
              >
                {isChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                添加
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              点击添加后会检查邮箱是否已注册，只有已注册用户会进入待发放列表。
            </p>

            <div className="rounded-md border">
              <div className="border-b px-3 py-2 text-sm font-medium">
                待发放用户（{recipients.length}）
              </div>
              {recipients.length === 0 ? (
                <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
                  暂无待发放用户
                </div>
              ) : (
                <ScrollArea className="h-40">
                  <div className="divide-y">
                    {recipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {recipient.name || "未设置姓名"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {recipient.email}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="cursor-pointer"
                          disabled={isPending}
                          aria-label={`移除 ${recipient.email}`}
                          title={`移除 ${recipient.email}`}
                          onClick={() =>
                            setRecipients((current) =>
                              current.filter(
                                (item) => item.id !== recipient.id,
                              ),
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="cursor-pointer"
            disabled={isPending || isChecking}
            onClick={() => {
              resetForm();
              setOpen(false);
            }}
          >
            取消
          </Button>
          <Button
            className="cursor-pointer"
            disabled={isPending || isChecking || recipients.length === 0}
            onClick={submit}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            批量添加（{recipients.length}）
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
