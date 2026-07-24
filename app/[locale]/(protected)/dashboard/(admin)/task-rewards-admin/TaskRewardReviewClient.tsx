"use client";

import {
  getAdminRewardApplicationEvidence,
  getAdminRewardApplications,
  reviewRewardApplicationAction,
  type AdminRewardApplicationListData,
  type AdminRewardApplicationRow,
} from "@/actions/task-rewards/admin";
import { AdminPagination } from "@/components/shared/AdminPagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { MANUAL_REVIEW_TASK_KEYS } from "@/config/task-rewards";
import {
  MANUAL_TASK_REWARD_ADMIN_PAGE_SIZE_OPTIONS,
  TASK_REWARD_ADMIN_APPLICATION_STATUSES,
} from "@/lib/task-rewards/admin-lists";
import { shouldApplyAdminEvidencePreview } from "@/lib/task-rewards/admin-evidence-preview";
import dayjs from "dayjs";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

function formatDate(value: string | null): string {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
}

export default function TaskRewardReviewClient({
  initialData,
}: {
  initialData: AdminRewardApplicationListData;
}) {
  const t = useTranslations("AdminTaskRewards");
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [pageIndex, setPageIndex] = useState(initialData.pageIndex);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">(
    "pending",
  );
  const [taskKey, setTaskKey] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 400);
  const [isLoading, setIsLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [selected, setSelected] = useState<AdminRewardApplicationRow | null>(
    null,
  );
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const evidenceRequestTokenRef = useRef(0);
  const selectedApplicationIdRef = useRef<string | null>(null);
  const reviewInFlightRef = useRef(false);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedQuery, pageSize, status, taskKey]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const result = await getAdminRewardApplications({
        pageIndex,
        pageSize,
        status,
        taskKey,
        query: debouncedQuery,
      });

      if (cancelled) return;
      if (!result.success || !result.data) {
        toast.error(result.success ? t("errors.load") : result.error);
        setIsLoading(false);
        return;
      }

      setData(result.data);
      setIsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, pageIndex, pageSize, reloadToken, status, taskKey, t]);

  const openApplication = async (row: AdminRewardApplicationRow) => {
    const requestToken = evidenceRequestTokenRef.current + 1;
    evidenceRequestTokenRef.current = requestToken;
    selectedApplicationIdRef.current = row.id;
    setSelected(row);
    setEvidenceUrl(null);
    setReviewNote("");
    setEvidenceLoading(true);

    const result = await getAdminRewardApplicationEvidence({
      applicationId: row.id,
    });
    if (!result.success || !result.data) {
      if (
        shouldApplyAdminEvidencePreview({
          requestToken,
          currentToken: evidenceRequestTokenRef.current,
          requestedApplicationId: row.id,
          currentApplicationId: selectedApplicationIdRef.current,
          resultApplicationId: row.id,
        })
      ) {
        toast.error(result.success ? t("errors.evidence") : result.error);
        setEvidenceLoading(false);
      }
      return;
    }

    if (
      shouldApplyAdminEvidencePreview({
        requestToken,
        currentToken: evidenceRequestTokenRef.current,
        requestedApplicationId: row.id,
        currentApplicationId: selectedApplicationIdRef.current,
        resultApplicationId: result.data.applicationId,
      })
    ) {
      setEvidenceUrl(result.data.presignedUrl);
      setEvidenceLoading(false);
    }
  };

  const closeApplication = () => {
    evidenceRequestTokenRef.current += 1;
    selectedApplicationIdRef.current = null;
    setSelected(null);
    setEvidenceUrl(null);
    setEvidenceLoading(false);
  };

  const review = async (decision: "approved" | "rejected") => {
    if (!selected || reviewInFlightRef.current) return;
    if (decision === "rejected" && !reviewNote.trim()) {
      toast.error(t("errors.reasonRequired"));
      return;
    }

    reviewInFlightRef.current = true;
    setProcessing(true);
    try {
      const result = await reviewRewardApplicationAction({
        applicationId: selected.id,
        decision,
        reviewNote: decision === "rejected" ? reviewNote : "",
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        decision === "approved" ? t("success.approved") : t("success.rejected"),
      );
      closeApplication();
      setReloadToken((value) => value + 1);
      router.refresh();
    } finally {
      reviewInFlightRef.current = false;
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          className="lg:max-w-sm"
          value={query}
          aria-label={t("filters.email")}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("filters.email")}
        />
        <Select
          value={status}
          onValueChange={(value) =>
            setStatus(value as "pending" | "approved" | "rejected")
          }
        >
          <SelectTrigger
            className="w-full lg:w-[180px]"
            aria-label={t("filters.status")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_REWARD_ADMIN_APPLICATION_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`status.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={taskKey || "all"}
          onValueChange={(value) => setTaskKey(value === "all" ? "" : value)}
        >
          <SelectTrigger
            className="w-full lg:w-[240px]"
            aria-label={t("filters.task")}
          >
            <SelectValue placeholder={t("filters.task")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allTasks")}</SelectItem>
            {MANUAL_REVIEW_TASK_KEYS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`tasks.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={() => setReloadToken((value) => value + 1)}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {t("actions.refresh")}
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-md border">
        {isLoading && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/70"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="sr-only">{t("loading")}</span>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.user")}</TableHead>
              <TableHead>{t("table.task")}</TableHead>
              <TableHead>{t("table.credits")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead>{t("table.submittedAt")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("table.empty")}
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{row.userEmail}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.userId}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{t(`tasks.${row.taskKey}`)}</TableCell>
                  <TableCell>{row.creditAmount}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "pending" ? "secondary" : "outline"
                      }
                    >
                      {t(`status.${row.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(row.submittedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processing}
                      onClick={() => void openApplication(row)}
                    >
                      {t("actions.view")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AdminPagination
        pageIndex={data.pageIndex}
        pageSize={data.pageSize}
        totalCount={data.totalCount}
        disabled={isLoading}
        pageSizeOptions={MANUAL_TASK_REWARD_ADMIN_PAGE_SIZE_OPTIONS}
        labels={{
          first: t("pagination.first"),
          previous: t("pagination.previous"),
          next: t("pagination.next"),
          last: t("pagination.last"),
          perPage: t("pagination.perPage"),
          range: t("pagination.range", {
            page: data.pageIndex + 1,
            pageCount: Math.max(1, Math.ceil(data.totalCount / data.pageSize)),
            count: data.totalCount,
          }),
        }}
        onPageIndexChange={setPageIndex}
        onPageSizeChange={setPageSize}
      />

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !processing) closeApplication();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("dialog.title")}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.userEmail} · ${t(`tasks.${selected.taskKey}`)}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("dialog.screenshot")}</p>
                <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                  {evidenceLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : evidenceUrl ? (
                    // The URL is a short-lived private R2 URL, so next/image remote patterns are intentionally avoided.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={evidenceUrl}
                      alt={t("dialog.screenshotAlt")}
                      className="max-h-[55vh] w-full object-contain"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("errors.evidence")}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t("dialog.submissionText")}
                </p>
                <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                  {selected.submissionText || "-"}
                </p>
              </div>

              {selected.status === "pending" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="review-note">
                    {t("dialog.rejectionReason")}
                  </label>
                  <Textarea
                    id="review-note"
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    maxLength={500}
                    disabled={processing}
                    placeholder={t("dialog.rejectionPlaceholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {reviewNote.length}/500
                  </p>
                </div>
              ) : (
                <div className="space-y-2 rounded-md border p-3 text-sm">
                  <p>
                    <span className="font-medium">{t("dialog.reviewer")}:</span>{" "}
                    {selected.reviewerEmail || selected.reviewedByUserId || "-"}
                  </p>
                  <p>
                    <span className="font-medium">
                      {t("dialog.reviewedAt")}:
                    </span>{" "}
                    {formatDate(selected.reviewedAt)}
                  </p>
                  <p className="whitespace-pre-wrap">
                    <span className="font-medium">
                      {t("dialog.reviewNote")}:
                    </span>{" "}
                    {selected.reviewNote || "-"}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selected?.status === "pending" ? (
              <>
                <Button
                  variant="destructive"
                  disabled={processing || !reviewNote.trim()}
                  onClick={() => void review("rejected")}
                >
                  {processing && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("actions.reject")}
                </Button>
                <Button
                  disabled={processing}
                  onClick={() => void review("approved")}
                >
                  {processing && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t("actions.approve")}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={closeApplication}>
                {t("actions.close")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
