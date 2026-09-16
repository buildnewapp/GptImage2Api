"use client";

import {
  getEmailLog,
  getEmailLogs,
  type EmailLogFilters,
  type EmailLogPage,
  type EmailLogRecord,
} from "@/actions/email-logs/admin";
import { AdminPagination } from "@/components/shared/AdminPagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/routing";
import { Loader2, Mail, RefreshCw, Search } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";

const templates = [
  "otp-code-email",
  "magic-link-email",
  "user-welcome",
  "newsletter-welcome",
  "invoice-payment-failed",
  "credit-upgrade-failed",
  "fraud-warning-admin",
  "fraud-refund-user",
  "admin-system-broadcast",
];
const emptyFilters = {
  query: "",
  provider: "all",
  status: "all",
  template: "",
  from: "",
  to: "",
} as const;

export function EmailLogsTable({
  initialData,
  initialError,
}: {
  initialData: EmailLogPage;
  initialError: string | null;
}) {
  const t = useTranslations("EmailLogs");
  const format = useFormatter();
  const [data, setData] = useState(initialData);
  const [draft, setDraft] = useState<EmailLogFilters>(emptyFilters);
  const [filters, setFilters] = useState<EmailLogFilters>({
    ...emptyFilters,
    pageIndex: 0,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EmailLogRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const pageIndex = filters.pageIndex ?? 0;
  const pageSize = filters.pageSize ?? 20;
  const dateTime = (value: Date | null) =>
    value
      ? format.dateTime(new Date(value), {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Shanghai",
        })
      : "—";

  async function load(next: EmailLogFilters) {
    const request = ++listRequest.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getEmailLogs(next);
      if (request !== listRequest.current) return;
      if (!result.success || !result.data)
        throw new Error(result.success ? t("loadError") : result.error);
      if (
        (next.pageIndex ?? 0) > 0 &&
        (next.pageIndex ?? 0) * (next.pageSize ?? 20) >= result.data.count
      ) {
        return await load({ ...next, pageIndex: 0 });
      }
      setData(result.data);
      setFilters(next);
    } catch (cause) {
      if (request === listRequest.current)
        setError(cause instanceof Error ? cause.message : t("loadError"));
    } finally {
      if (request === listRequest.current) setLoading(false);
    }
  }

  async function openDetail(id: string) {
    const request = ++detailRequest.current;
    setSelectedId(id);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const result = await getEmailLog(id);
      if (request !== detailRequest.current) return;
      if (!result.success || !result.data)
        throw new Error(result.success ? t("loadError") : result.error);
      setDetail(result.data);
    } catch (cause) {
      if (request === detailRequest.current)
        setDetailError(cause instanceof Error ? cause.message : t("loadError"));
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  }

  function search(event: FormEvent) {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) {
      setError(t("invalidDates"));
      return;
    }
    void load({ ...draft, pageIndex: 0, pageSize });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={search}
        className="space-y-4 rounded-xl border bg-card p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email-log-query">{t("search")}</Label>
            <Input
              id="email-log-query"
              maxLength={200}
              placeholder={t("searchPlaceholder")}
              value={draft.query ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, query: event.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-log-provider">{t("provider")}</Label>
            <Select
              value={draft.provider}
              onValueChange={(value) =>
                setDraft({
                  ...draft,
                  provider: value as EmailLogFilters["provider"],
                })
              }
            >
              <SelectTrigger id="email-log-provider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "resend", "cloudflare"].map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === "all"
                      ? t("all")
                      : value === "resend"
                        ? "Resend"
                        : "Cloudflare"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-log-status">{t("statusLabel")}</Label>
            <Select
              value={draft.status}
              onValueChange={(value) =>
                setDraft({
                  ...draft,
                  status: value as EmailLogFilters["status"],
                })
              }
            >
              <SelectTrigger id="email-log-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "sending", "sent", "failed", "unknown"].map(
                  (value) => (
                    <SelectItem key={value} value={value}>
                      {value === "all" ? t("all") : t(`status.${value}`)}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email-log-template">{t("template")}</Label>
            <Select
              value={draft.template || "all"}
              onValueChange={(value) =>
                setDraft({ ...draft, template: value === "all" ? "" : value })
              }
            >
              <SelectTrigger id="email-log-template" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                {templates.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`templates.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-log-from">{t("fromDate")}</Label>
            <Input
              id="email-log-from"
              type="date"
              value={draft.from ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, from: event.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-log-to">{t("toDate")}</Label>
            <Input
              id="email-log-to"
              type="date"
              value={draft.to ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, to: event.target.value })
              }
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            {t("search")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => {
              setDraft(emptyFilters);
              void load({ ...emptyFilters, pageIndex: 0, pageSize });
            }}
          >
            {t("reset")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={() => void load(filters)}
          >
            <RefreshCw className="size-4" />
            {t("refresh")}
          </Button>
          <Button variant="link" asChild className="sm:ml-auto">
            <Link href="/dashboard/system-emails">{t("compose")}</Link>
          </Button>
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{t("statusHint")}</p>
      <div className="overflow-hidden rounded-xl border" aria-busy={loading}>
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "time",
                "recipient",
                "sender",
                "subject",
                "template",
                "provider",
                "statusLabel",
                "actions",
              ].map((key) => (
                <TableHead key={key} className="whitespace-nowrap">
                  {t(key)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.logs.length ? (
              data.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {dateTime(log.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-56 break-all text-sm">
                    {log.toEmail}
                  </TableCell>
                  <TableCell className="max-w-56 break-all text-sm">
                    <div>{log.fromName}</div>
                    <div className="text-xs text-muted-foreground">
                      {log.fromEmail ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-64">
                    <div className="truncate" title={log.subject}>
                      {log.subject}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {templates.includes(log.templateKey)
                      ? t(`templates.${log.templateKey}`)
                      : log.templateKey}
                  </TableCell>
                  <TableCell className="text-xs">
                    {log.provider === "cloudflare"
                      ? "Cloudflare"
                      : log.provider === "resend"
                        ? "Resend"
                        : log.provider}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge
                      variant={
                        log.status === "failed"
                          ? "destructive"
                          : log.status === "sent"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {t(`status.${log.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void openDetail(log.id)}
                      aria-label={`${t("details")}: ${log.subject}`}
                    >
                      {t("details")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-40 text-center text-muted-foreground"
                >
                  <Mail className="mx-auto mb-3 size-6" />
                  {error ? t("loadError") : t("empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AdminPagination
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalCount={data.count}
        disabled={loading}
        labels={{
          first: t("pagination.first"),
          previous: t("pagination.previous"),
          next: t("pagination.next"),
          last: t("pagination.last"),
          perPage: t("pagination.perPage"),
          range: t("pagination.range", {
            page: pageIndex + 1,
            pages: Math.max(1, Math.ceil(data.count / pageSize)),
            count: data.count,
          }),
        }}
        onPageIndexChange={(index) =>
          void load({ ...filters, pageIndex: index })
        }
        onPageSizeChange={(size) =>
          void load({ ...filters, pageIndex: 0, pageSize: size })
        }
      />

      <Sheet
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) {
            ++detailRequest.current;
            setSelectedId(null);
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{t("details")}</SheetTitle>
            <SheetDescription>{t("detailHint")}</SheetDescription>
          </SheetHeader>
          <div className="space-y-6 px-4 pb-8">
            {detailLoading && (
              <div role="status" className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin" />
                {t("loading")}
              </div>
            )}
            {detailError && (
              <p role="alert" className="text-sm text-destructive">
                {detailError}
              </p>
            )}
            {detail && (
              <>
                <dl className="grid gap-4 text-sm">
                  {[
                    [t("recordId"), detail.id],
                    [t("recipient"), detail.toEmail],
                    [
                      t("sender"),
                      `${detail.fromName ?? ""} <${detail.fromEmail ?? "—"}>`,
                    ],
                    [t("subject"), detail.subject],
                    [t("template"), detail.templateKey],
                    [t("provider"), detail.provider],
                    [t("statusLabel"), t(`status.${detail.status}`)],
                    [
                      t("deliveryLabel"),
                      detail.deliveryStatus
                        ? t(`delivery.${detail.deliveryStatus}`)
                        : t("delivery.unconfirmed"),
                    ],
                    [t("time"), dateTime(detail.createdAt)],
                    [t("sentAt"), dateTime(detail.sentAt)],
                    [t("updatedAt"), dateTime(detail.updatedAt)],
                    [t("messageId"), detail.providerMessageId ?? "—"],
                    [t("jobId"), detail.jobId ?? "—"],
                    [t("idempotencyKey"), detail.idempotencyKey ?? "—"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="grid gap-1 sm:grid-cols-[140px_1fr]"
                    >
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="break-all whitespace-pre-wrap">{value}</dd>
                    </div>
                  ))}
                </dl>
                {detail.errorMessage && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <h3 className="mb-2 text-sm font-medium">
                      {t("errorLabel")}
                    </h3>
                    <p className="whitespace-pre-wrap break-all text-sm text-destructive">
                      {detail.errorMessage}
                    </p>
                  </div>
                )}
                <div>
                  <h3 className="mb-2 text-sm font-medium">{t("variables")}</h3>
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-4 text-xs">
                    {JSON.stringify(detail.variables, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
