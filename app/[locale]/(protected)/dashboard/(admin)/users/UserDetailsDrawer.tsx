"use client";

import { getUserDetails } from "@/actions/users/admin";
import type { AdminUserDetails, UserWithSource } from "@/actions/users/admin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { buildAdminUserQuickActionLinks } from "@/lib/admin/dashboard-users";
import dayjs from "dayjs";
import { Copy, ExternalLink, X } from "lucide-react";
import { useLocale } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function formatDate(value: Date | string | null | undefined) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";
}

function formatMoney(amount: string | null, currency: string | null) {
  if (!amount) {
    return "-";
  }

  return `${amount} ${currency?.toUpperCase() || ""}`.trim();
}

function copyText(value: string | null | undefined, label: string) {
  if (!value) {
    return;
  }

  navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
}

function CopyValue({
  value,
  label,
  muted = false,
}: {
  value: string | null | undefined;
  label: string;
  muted?: boolean;
}) {
  if (!value) {
    return "-";
  }

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 align-middle"
          onClick={() => copyText(value, label)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              copyText(value, label);
            }
          }}
    >
      <span
        title={value}
        role="button"
        tabIndex={0}
        className={
          muted
            ? "min-w-0 cursor-pointer truncate text-muted-foreground hover:underline"
            : "min-w-0 cursor-pointer truncate hover:underline"
        }
      >
        {value}
      </span>
      <Copy className="h-3.5 w-3.5" />
    </span>
  );
}

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild size="xs" variant="link" className="gap-1.5">
      <a href={href} target="_blank" rel="noreferrer">
        {label}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </Button>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="min-w-0">{value || "-"}</div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      <div className="rounded-md border p-4">{children}</div>
    </section>
  );
}

function EmptyState() {
  return <div className="text-sm text-muted-foreground">暂无记录</div>;
}

function UserDetailsContent({ details }: { details: AdminUserDetails }) {
  const { user, buckets, subscriptions, orders } = details;
  const locale = useLocale();
  const links = buildAdminUserQuickActionLinks({ locale, userId: user.id });
  const totalCredits = user.totalCredits ?? 0;
  const subscriptionCredits = user.subscriptionCreditsBalance ?? 0;
  const oneTimeCredits = user.oneTimeCreditsBalance ?? 0;
  const subscriptionListHref = links.orders;

  return (
    <div className="space-y-6">
      <Section title="用户基础信息">
        <div className="space-y-3">
          <InfoRow
            label="用户 ID"
            value={<CopyValue value={user.id} label="User ID" />}
          />
          <InfoRow label="姓名" value={user.name || "-"} />
          <InfoRow
            label="邮箱"
            value={<CopyValue value={user.email} label="Email" />}
          />
          <InfoRow
            label="角色"
            value={<Badge variant="secondary">{user.role || "user"}</Badge>}
          />
          <InfoRow
            label="状态"
            value={
              user.banned ? (
                <Badge variant="destructive">Banned</Badge>
              ) : (
                <Badge variant="outline">Active</Badge>
              )
            }
          />
          {user.banned ? (
            <InfoRow label="封禁原因" value={user.banReason || "-"} />
          ) : null}
          <InfoRow label="注册时间" value={formatDate(user.createdAt)} />
          <InfoRow label="更新时间" value={formatDate(user.updatedAt)} />
          <InfoRow label="来源" value={user.utmSource || user.affCode || "-"} />
          <InfoRow
            label="国家 / 语言"
            value={`${user.countryCode || "-"} / ${user.language || "-"}`}
          />
          <InfoRow
            label="设备"
            value={
              [user.browser, user.os, user.deviceType]
                .filter(Boolean)
                .join(" / ") || "-"
            }
          />
        </div>
      </Section>

      <Section
        title="用户积分信息"
        action={<SectionLink href={links.credits} label="打开积分列表" />}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">总积分</div>
            <div className="text-2xl font-semibold">{totalCredits}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">订阅积分</div>
            <div className="text-2xl font-semibold">{subscriptionCredits}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">一次性积分</div>
            <div className="text-2xl font-semibold">{oneTimeCredits}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">历史购买积分</div>
            <div className="text-2xl font-semibold">
              {details.creditStats.purchasedCredits}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">消耗积分</div>
            <div className="text-2xl font-semibold">
              {details.creditStats.consumedCredits}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="生成模块"
        action={<SectionLink href={links.generations} label="打开生成列表" />}
      >
        <a
          href={links.generations}
          target="_blank"
          rel="noreferrer"
          className="grid gap-3 rounded-sm outline-none sm:grid-cols-3"
        >
          <div>
            <div className="text-xs text-muted-foreground">生成总数</div>
            <div className="text-2xl font-semibold">
              {details.generationStats.total}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">成功数</div>
            <div className="text-2xl font-semibold">
              {details.generationStats.succeeded}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">成功率</div>
            <div className="text-2xl font-semibold">
              {details.generationStats.successRate}%
            </div>
          </div>
        </a>
      </Section>

      <Section
        title="用户订阅积分 bucket 记录"
        action={<SectionLink href={links.credits} label="打开积分列表" />}
      >
        {buckets.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {buckets.map((bucket) => (
              <div
                key={bucket.id}
                className="rounded-md bg-muted/40 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">
                    {bucket.creditsRemaining} / {bucket.creditsTotal} credits
                  </div>
                  <Badge variant="outline">{bucket.provider}</Badge>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <div>
                    Period: {formatDate(bucket.periodStart)} -{" "}
                    {formatDate(bucket.periodEnd)}
                  </div>
                  <div>Expires: {formatDate(bucket.expiresAt)}</div>
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="shrink-0">Subscription:</span>
                    <CopyValue
                      value={bucket.subscriptionId}
                      label="Subscription ID"
                      muted
                    />
                  </div>
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="shrink-0">Order:</span>
                    <CopyValue
                      value={bucket.relatedOrderId}
                      label="Order ID"
                      muted
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="用户订阅记录（最近 5 条）"
        action={
          <SectionLink href={subscriptionListHref} label="打开订阅列表" />
        }
      >
        {subscriptions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="rounded-md bg-muted/40 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">
                    {subscription.planTitle || subscription.planId}
                  </div>
                  <Badge variant="outline">{subscription.status}</Badge>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <div>
                    {subscription.provider} ·{" "}
                    {subscription.cancelAtPeriodEnd
                      ? "Cancel at period end"
                      : "Renewing"}
                  </div>
                  <div>
                    Period: {formatDate(subscription.currentPeriodStart)} -{" "}
                    {formatDate(subscription.currentPeriodEnd)}
                  </div>
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="shrink-0">Subscription ID:</span>
                    <CopyValue value={subscription.subscriptionId} label="Subscription ID" muted />
                  </div>
                  <div>Created: {formatDate(subscription.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="用户订单（最近 5 条）"
        action={<SectionLink href={links.orders} label="打开订单列表" />}
      >
        {orders.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-md bg-muted/40 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">
                    {order.planTitle || order.orderType}
                  </div>
                  <Badge variant="outline">{order.status}</Badge>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <div>
                    {order.provider} · {order.orderType} ·{" "}
                    {formatMoney(order.amountTotal, order.currency)}
                  </div>
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="shrink-0">Provider order:</span>
                    <CopyValue
                      value={order.providerOrderId}
                      label="Provider order ID"
                      muted
                    />
                  </div>
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="shrink-0">Order ID:</span>
                    <CopyValue value={order.id} label="Order ID" muted />
                  </div>
                  <div>Created: {formatDate(order.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export function UserDetailsDrawer({ user }: { user: UserWithSource }) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<AdminUserDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const displayName = user.name || user.email || user.id;

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getUserDetails({ userId: user.id })
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.success && result.data) {
          setDetails(result.data);
        } else {
          setDetails(null);
          setError(
            result.success ? "Failed to load user details" : result.error,
          );
        }
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        setDetails(null);
        setError(
          err instanceof Error ? err.message : "Failed to load user details",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, user.id]);

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <div className="flex min-w-[240px] items-center gap-3">
        <button
          type="button"
          className="rounded-sm outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setOpen(true)}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.image || undefined} alt={displayName} />
            <AvatarFallback>{displayName[0].toUpperCase()}</AvatarFallback>
          </Avatar>
        </button>
        <div className="flex min-w-0 flex-col">
          <button
            type="button"
            className="flex min-w-0 items-center gap-1.5 rounded-sm text-left outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setOpen(true)}
          >
            <span className="truncate font-medium">{user.name || ""}</span>
            {user.role === "admin" && (
              <span className="text-xs font-medium capitalize text-primary">
                ({user.role})
              </span>
            )}
          </button>
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              role="button"
              tabIndex={0}
              title={user.email}
              className="max-w-[220px] cursor-pointer truncate text-sm text-muted-foreground hover:underline"
              onClick={() => copyText(user.email, "Email")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  copyText(user.email, "Email");
                }
              }}
            >
              {user.email}
            </span>
            <Copy className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      <DrawerContent className="overflow-hidden p-0 data-[vaul-drawer-direction=right]:h-full data-[vaul-drawer-direction=right]:w-[92vw] data-[vaul-drawer-direction=right]:sm:max-w-2xl">
        <DrawerHeader className="border-b pr-14">
          <DrawerTitle>{displayName}</DrawerTitle>
          <DrawerDescription className="break-all">{user.id}</DrawerDescription>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 h-8 w-8"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <ScrollArea className="h-[calc(100vh-97px)]">
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : details ? (
              <UserDetailsContent details={details} />
            ) : null}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
