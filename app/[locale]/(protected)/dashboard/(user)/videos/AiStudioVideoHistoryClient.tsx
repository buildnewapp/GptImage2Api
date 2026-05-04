"use client";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  AI_VIDEO_STUDIO_FORM_STORAGE_KEY,
  serializeAiVideoStudioStoredState,
} from "@/lib/ai-video-studio/storage";
import type { LegacyVideoHistoryRecord } from "@/lib/ai-studio/dashboard-videos";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eye,
  EyeOff,
  Film,
  ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  RefreshCcw,
  Search,
  Settings,
  Trash2,
  Video,
  WandSparkles,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type VideoGeneration = LegacyVideoHistoryRecord;

function mapTaskStateToLegacyStatus(state: string) {
  if (state === "succeeded") {
    return "success";
  }

  if (state === "failed") {
    return "failed";
  }

  return "pending";
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push("ellipsis");
  }

  for (let nextPage = start; nextPage <= end; nextPage += 1) {
    items.push(nextPage);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis");
  }

  items.push(totalPages);
  return items;
}

function parsePage(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

const AI_STUDIO_HISTORY_VIEW_MODE_STORAGE_KEY = "ai-studio-history-view-mode";

export default function AiStudioVideoHistoryClient() {
  const t = useTranslations("VideoGeneration");
  const tLanding = useTranslations("Landing.Hero");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<VideoGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<VideoGeneration | null>(
    null,
  );
  const [selectedPayload, setSelectedPayload] = useState<{
    title: string;
    value: unknown;
  } | null>(null);
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState<
    string | null
  >(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const page = parsePage(searchParams.get("page"));
  const rawStatusFilter = searchParams.get("status");
  const statusFilter =
    rawStatusFilter === "pending" ||
    rawStatusFilter === "success" ||
    rawStatusFilter === "failed"
      ? rawStatusFilter
      : "all";
  const searchQuery = searchParams.get("q")?.trim() ?? "";
  const viewParam = searchParams.get("view");
  const viewMode = viewParam === "list" ? "list" : "card";
  const [searchInput, setSearchInput] = useState(searchQuery);
  const paginationItems = buildPaginationItems(page, totalPages);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (viewParam === "list" || viewParam === "card") {
      try {
        window.localStorage.setItem(AI_STUDIO_HISTORY_VIEW_MODE_STORAGE_KEY, viewMode);
      } catch {
        // ignore storage failure
      }
      return;
    }

    let storedMode: string | null = null;
    try {
      storedMode = window.localStorage.getItem(AI_STUDIO_HISTORY_VIEW_MODE_STORAGE_KEY);
    } catch {
      return;
    }

    if (storedMode !== "list" && storedMode !== "card") {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (storedMode === "card") {
      params.delete("view");
    } else {
      params.set("view", storedMode);
    }
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) {
      return;
    }
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams, viewMode, viewParam]);

  const updateQueryParams = useCallback(
    (updates: { page?: number; status?: string; q?: string; view?: string }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.page && updates.page > 1) {
        params.set("page", String(updates.page));
      } else if (updates.page !== undefined) {
        params.delete("page");
      }

      if (updates.status && updates.status !== "all") {
        params.set("status", updates.status);
      } else if (updates.status !== undefined) {
        params.delete("status");
      }

      if (updates.q && updates.q.trim()) {
        params.set("q", updates.q.trim());
      } else if (updates.q !== undefined) {
        params.delete("q");
      }

      if (updates.view && updates.view !== "card") {
        params.set("view", updates.view);
      } else if (updates.view !== undefined) {
        params.delete("view");
      }

      const nextQuery = params.toString();
      router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const persistViewMode = useCallback((mode: "card" | "list") => {
    try {
      window.localStorage.setItem(AI_STUDIO_HISTORY_VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      // ignore storage failure
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (searchQuery) {
        params.set("q", searchQuery);
      }

      const res = await fetch(`/api/ai-studio/video-history?${params}`);
      const data = await res.json();

      if (data.success) {
        const fetchedRecords = data.data?.records || [];
        setRecords(fetchedRecords);
        setTotalPages(data.data?.totalPages || 1);
        setTotalCount(data.data?.total || 0);

        const pendingRecords = fetchedRecords.filter(
          (record: VideoGeneration) =>
            record.status === "pending" &&
            typeof record.providerTaskId === "string" &&
            record.providerTaskId.length > 0 &&
            typeof record.catalogModelId === "string" &&
            record.catalogModelId.length > 0,
        );

        pendingRecords.slice(0, 5).forEach((record: VideoGeneration) => {
          fetch(
            `/api/ai-studio/tasks/${record.providerTaskId}?modelId=${encodeURIComponent(
              record.catalogModelId!,
            )}`,
          )
            .then((response) => response.json())
            .then((statusData) => {
              if (statusData.success && statusData.data) {
                const newStatus = mapTaskStateToLegacyStatus(
                  statusData.data.state,
                );
                setRecords((current) =>
                  current.map((item) =>
                    item.id === record.id
                      ? {
                          ...item,
                          status: newStatus,
                          resultUrls:
                            statusData.data.mediaUrls?.length > 0
                              ? statusData.data.mediaUrls
                              : item.resultUrls,
                          resultUrl:
                            statusData.data.mediaUrls?.[0] || item.resultUrl,
                          responsePayload:
                            statusData.data.raw ?? item.responsePayload,
                          creditsRefunded:
                            Number(statusData.data.refundedCredits ?? 0) > 0 ||
                            item.creditsRefunded,
                        }
                      : item,
                  ),
                );
              }
            })
            .catch(() => {
              // ignore polling failures here
            });
        });
      }
    } catch {
      // ignore history failures
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!selectedRecord) {
      return;
    }

    const nextSelectedRecord =
      records.find((record) => record.id === selectedRecord.id) ?? null;
    setSelectedRecord(nextSelectedRecord);
  }, [records, selectedRecord]);

  const getTaskParamsLine = useCallback(
    (record: VideoGeneration) => {
      const isImage = record.category === "image";
      const parts: string[] = [
        tLanding("form.creditsRequired", {
          count: record.creditsRequired ?? record.creditsUsed,
        }),
        isImage
          ? record.uploadedImage
            ? t("media.image_to_image")
            : t("media.text_to_image")
          : record.mode === "image-to-video" ||
              (!record.mode && record.uploadedImage)
            ? tLanding("form.imageToVideo")
            : tLanding("form.textToVideo"),
      ];

      if (record.providerValues?.resolution) {
        parts.push(
          `${tLanding("form.resolution")}: ${record.providerValues.resolution}`,
        );
      }
      if (record.providerValues?.aspectRatio) {
        parts.push(
          `${tLanding("form.aspectRatio")}: ${record.providerValues.aspectRatio}`,
        );
      }
      if (record.providerValues?.duration) {
        parts.push(
          `${tLanding("form.duration")}: ${record.providerValues.duration}`,
        );
      }

      return parts.join(" · ");
    },
    [t, tLanding],
  );

  const formatCompactDateTime = useCallback(
    (value: string | Date) =>
      new Intl.DateTimeFormat(locale, {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value)),
    [locale],
  );

  const handleDownloadMedia = useCallback(
    (url: string | null, taskId: string, category: string) => {
      if (!url) {
        return;
      }

      const link = document.createElement("a");
      let extension = category === "image" ? "png" : "mp4";

      try {
        const pathname = new URL(url).pathname;
        const matchedExtension = pathname.match(/\.([a-z0-9]+)$/i)?.[1];
        if (matchedExtension) {
          extension = matchedExtension.toLowerCase();
        }
      } catch {
        // ignore malformed urls and keep the fallback extension
      }

      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = `${category}-task-${taskId || Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    [],
  );

  const handleOpenImage = useCallback((url: string) => {
    if (!url) {
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handleCopyPrompt = useCallback(
    async (prompt: string | null) => {
      if (!prompt) {
        return;
      }

      try {
        await navigator.clipboard.writeText(prompt);
        toast.success(tLanding("form.promptCopied"));
      } catch {
        toast.error(tLanding("form.copyFailed"));
      }
    },
    [tLanding],
  );

  const copyText = useCallback(
    async (value: string, successMessage: string) => {
      try {
        await navigator.clipboard.writeText(value);
        toast.success(successMessage);
      } catch {
        toast.error(t("copy_failed"));
      }
    },
    [t],
  );

  const handleCopyTaskId = useCallback(
    async (taskId: string | null | undefined) => {
      if (!taskId) {
        return;
      }

      await copyText(taskId, t("task_id_copied"));
    },
    [copyText, t],
  );

  const handleCopyRequest = useCallback(
    async (requestPayload: unknown) => {
      if (!requestPayload) {
        return;
      }

      try {
        const serialized = JSON.stringify(
          requestPayload,
          (key, value) => (key === "callBackUrl" ? undefined : value),
          2,
        );

        if (!serialized) {
          return;
        }

        await copyText(serialized, t("request_copied"));
      } catch {
        toast.error(t("request_copy_failed"));
      }
    },
    [copyText, t],
  );

  const handleCopyResponse = useCallback(
    async (responsePayload: unknown) => {
      if (responsePayload == null) {
        return;
      }

      try {
        const serialized =
          typeof responsePayload === "string"
            ? responsePayload
            : JSON.stringify(responsePayload, null, 2);

        if (!serialized) {
          return;
        }

        await copyText(serialized, t("response_copied"));
      } catch {
        toast.error(t("response_copy_failed"));
      }
    },
    [copyText, t],
  );

  const handleRemix = useCallback(
    (record: VideoGeneration) => {
      if (!record.modelKey || !record.versionKey) {
        return;
      }

      const formValues =
        record.requestPayload?.input &&
        typeof record.requestPayload.input === "object" &&
        !Array.isArray(record.requestPayload.input)
          ? { ...(record.requestPayload.input as Record<string, unknown>) }
          : Object.fromEntries(
              Object.entries(record.requestPayload ?? {}).filter(
                ([key]) => key !== "model",
              ),
            );

      try {
        window.localStorage.setItem(
          AI_VIDEO_STUDIO_FORM_STORAGE_KEY,
          serializeAiVideoStudioStoredState({
            familyKey: record.modelKey,
            versionKey: record.versionKey,
            isPublic: record.isPublic,
            formValues,
          }),
        );
      } catch {
        return;
      }

      router.push(`/${locale}/dashboard/generate`);
    },
    [locale, router],
  );

  const handleToggleVisibility = useCallback(
    async (record: VideoGeneration) => {
      if (updatingVisibilityId) {
        return;
      }

      const nextIsPublic = !record.isPublic;
      setUpdatingVisibilityId(record.id);

      try {
        const res = await fetch("/api/ai-studio/video-history", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: record.id,
            isPublic: nextIsPublic,
          }),
        });
        const data = await res.json();

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "update failed");
        }

        setRecords((current) =>
          current.map((item) =>
            item.id === record.id ? { ...item, isPublic: nextIsPublic } : item,
          ),
        );
        toast.success(t("visibility_updated"));
      } catch {
        toast.error(t("visibility_update_failed"));
      } finally {
        setUpdatingVisibilityId(null);
      }
    },
    [t, updatingVisibilityId],
  );

  const handleDelete = useCallback(
    async (record: VideoGeneration) => {
      if (deletingId) {
        return;
      }

      if (!window.confirm(t("delete_confirm"))) {
        return;
      }

      setDeletingId(record.id);

      try {
        const res = await fetch(
          `/api/ai-studio/video-history?id=${encodeURIComponent(record.id)}`,
          {
            method: "DELETE",
          },
        );
        const data = await res.json();

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "delete failed");
        }

        const nextPage = records.length === 1 && page > 1 ? page - 1 : page;
        if (nextPage !== page) {
          updateQueryParams({
            page: nextPage,
            status: statusFilter,
            q: searchQuery,
          });
        } else {
          void fetchHistory();
        }
        toast.success(t("delete_success"));
      } catch {
        toast.error(t("delete_failed"));
      } finally {
        setDeletingId(null);
      }
    },
    [
      deletingId,
      fetchHistory,
      page,
      records.length,
      searchQuery,
      statusFilter,
      t,
      updateQueryParams,
    ],
  );

  const getStatusBadge = (
    status: string,
    refunded: boolean,
    category: string,
  ) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
          >
            <Clock className="w-3 h-3 mr-1" />
            {t("status.pending")}
          </Badge>
        );
      case "success":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
          >
            {category === "image" ? (
              <ImageIcon className="w-3 h-3 mr-1" />
            ) : (
              <Video className="w-3 h-3 mr-1" />
            )}
            {t("status.success")}
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
          >
            {t("status.failed")}
            {refunded && (
              <span className="ml-1 text-xs">({t("credits_refunded")})</span>
            )}
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatModelName = (model: string) => {
    const sanitized = model.includes("/")
      ? model.split("/").at(-1) || model
      : model;
    return sanitized
      .replace("bytedance/", "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const formatDetailDateTime = useCallback(
    (value: string | Date) =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(value)),
    [locale],
  );

  const formatJsonBlock = useCallback((value: unknown) => {
    if (value == null) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, []);

  const formatTableDateTime = useCallback((value: string | Date | null | undefined) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");
    return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
  }, []);

  const getDurationSeconds = useCallback((record: VideoGeneration) => {
    if (!record.completedAt) {
      return null;
    }

    const createdAt = new Date(record.createdAt);
    const completedAt = new Date(record.completedAt);
    if (
      Number.isNaN(createdAt.getTime()) ||
      Number.isNaN(completedAt.getTime())
    ) {
      return null;
    }

    return Math.max(0, Math.round((completedAt.getTime() - createdAt.getTime()) / 1000));
  }, []);

  const getFailureReason = useCallback((record: VideoGeneration) => {
    if (record.status !== "failed") {
      return null;
    }

    const candidates: string[] = [];
    const addCandidate = (value: unknown) => {
      if (typeof value !== "string") {
        return;
      }

      const nextValue = value.trim();
      if (nextValue.length > 0) {
        candidates.push(nextValue);
      }
    };

    addCandidate(record.responsePayload);

    if (
      record.responsePayload &&
      typeof record.responsePayload === "object" &&
      !Array.isArray(record.responsePayload)
    ) {
      const payload = record.responsePayload as Record<string, unknown>;
      addCandidate(payload.statusReason);
      addCandidate(payload.reason);
      addCandidate(payload.message);
      addCandidate(payload.error);

      if (
        payload.error &&
        typeof payload.error === "object" &&
        !Array.isArray(payload.error)
      ) {
        const errorPayload = payload.error as Record<string, unknown>;
        addCandidate(errorPayload.reason);
        addCandidate(errorPayload.message);
      }
    }

    return candidates[0] ?? t("unknown_failure_reason");
  }, [t]);

  const selectedDurationSeconds = selectedRecord
    ? getDurationSeconds(selectedRecord)
    : null;
  const selectedFailureReason = selectedRecord
    ? getFailureReason(selectedRecord)
    : null;

  const detailRows: Array<{
    key: string;
    label: string;
    value: string;
    copyValue?: string;
    copySuccessMessage?: string;
  }> = selectedRecord
    ? [
        {
          key: "id",
          label: t("detail.fields.id"),
          value: selectedRecord.id,
          copyValue: selectedRecord.id,
          copySuccessMessage: t("id_copied"),
        },
        {
          key: "status",
          label: t("detail.fields.status"),
          value: t(`status.${selectedRecord.status}`),
        },
        {
          key: "category",
          label: t("detail.fields.category"),
          value:
            selectedRecord.category === "image"
              ? t("detail.category.image")
              : t("detail.category.video"),
        },
        {
          key: "model",
          label: t("detail.fields.model"),
          value:
            selectedRecord.modelLabel ||
            formatModelName(selectedRecord.model) ||
            "-",
        },
        {
          key: "catalog_model",
          label: t("detail.fields.catalog_model"),
          value: selectedRecord.catalogModelId || "-",
        },
        {
          key: "task_id",
          label: t("detail.fields.task_id"),
          value: selectedRecord.taskId || "-",
          copyValue: selectedRecord.taskId || undefined,
          copySuccessMessage: t("task_id_copied"),
        },
        {
          key: "provider_task_id",
          label: t("detail.fields.provider_task_id"),
          value: selectedRecord.providerTaskId || "-",
        },
        {
          key: "visibility",
          label: t("detail.fields.visibility"),
          value: selectedRecord.isPublic
            ? tLanding("form.public")
            : tLanding("form.private"),
        },
        {
          key: "credits",
          label: t("detail.fields.credits"),
          value: String(selectedRecord.creditsRequired ?? selectedRecord.creditsUsed),
        },
        {
          key: "used_credits",
          label: t("detail.fields.used_credits"),
          value: String(selectedRecord.creditsUsed),
        },
        {
          key: "created_at",
          label: t("detail.fields.created_at"),
          value: formatDetailDateTime(selectedRecord.createdAt),
        },
        {
          key: "completed_at",
          label: t("detail.fields.completed_at"),
          value: selectedRecord.completedAt
            ? formatDetailDateTime(selectedRecord.completedAt)
            : "-",
        },
        {
          key: "duration",
          label: t("detail.fields.duration"),
          value:
            selectedDurationSeconds == null ? "-" : `${selectedDurationSeconds}s`,
        },
        {
          key: "mode",
          label: t("detail.fields.mode"),
          value: selectedRecord.mode
            ? selectedRecord.mode === "image-to-video"
              ? tLanding("form.imageToVideo")
              : tLanding("form.textToVideo")
            : "-",
        },
      ]
    : [];

  const renderUserActions = (
    record: VideoGeneration,
    options?: { compact?: boolean; stopPropagation?: boolean },
  ) => {
    const compact = options?.compact ?? false;
    const stopPropagation = options?.stopPropagation ?? false;
    const visibilityDisabled =
      !record.visibilityAvailable || updatingVisibilityId === record.id;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {compact ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("columns.user_actions")}
              onClick={(event) => {
                if (stopPropagation) {
                  event.stopPropagation();
                }
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="xs"
              aria-label={t("columns.actions")}
              onClick={(event) => {
                if (stopPropagation) {
                  event.stopPropagation();
                }
              }}
            >
              <Settings className="w-3 h-3" />
              {t("columns.actions")}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-44"
          onClick={(event) => {
            if (stopPropagation) {
              event.stopPropagation();
            }
          }}
        >
          <DropdownMenuItem
            onClick={() =>
              handleDownloadMedia(record.resultUrl, record.taskId, record.category)
            }
            disabled={!record.resultUrl}
          >
            <Download className="w-4 h-4" />
            {t("download")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await handleCopyTaskId(record.taskId);
            }}
            disabled={!record.taskId}
          >
            <Copy className="w-4 h-4" />
            {t("copy_task_id")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void handleCopyPrompt(record.prompt)}
            disabled={!record.prompt}
          >
            <Copy className="w-4 h-4" />
            {t("copy_prompt")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void handleCopyRequest(record.requestPayload)}
            disabled={!record.requestPayload}
          >
            <Copy className="w-4 h-4" />
            {t("copy_request")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void handleToggleVisibility(record)}
            disabled={visibilityDisabled}
          >
            {updatingVisibilityId === record.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : record.isPublic ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            {record.isPublic ? t("make_private") : t("make_public")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleRemix(record)}
            disabled={!record.modelKey || !record.versionKey}
          >
            <WandSparkles className="w-4 h-4" />
            {tLanding("form.remix")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void handleDelete(record)}
            disabled={deletingId === record.id}
            variant="destructive"
          >
            {deletingId === record.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (loading && records.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            updateQueryParams({
              page: 1,
              status: statusFilter,
              q: searchInput,
            });
          }}
        >
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("search.placeholder")}
            className="rounded-lg"
          />
          <Button
            type="submit"
            variant="outline"
            className="shrink-0 rounded-lg"
          >
            <Search className="w-4 h-4" />
            {t("search.submit")}
          </Button>
          {searchQuery ? (
            <Button
              type="button"
              variant="ghost"
              className="shrink-0 rounded-lg"
              onClick={() => {
                setSearchInput("");
                updateQueryParams({
                  page: 1,
                  status: statusFilter,
                  q: "",
                });
              }}
            >
              {t("search.clear")}
            </Button>
          ) : null}
        </form>

        <div className="flex flex-wrap items-center gap-3">
          {["all", "pending", "success", "failed"].map((status) => (
            <Button
              key={status}
              type="button"
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() =>
                updateQueryParams({
                  page: 1,
                  status,
                  q: searchQuery,
                })
              }
              className={cn(
                "rounded-lg transition-all",
                statusFilter !== status &&
                  "bg-card text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {status === "all" ? t("filter.all") : t(`status.${status}`)}
            </Button>
          ))}
          <div className="inline-flex items-center overflow-hidden rounded-lg border bg-card">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-none border-r",
                viewMode === "card" && "bg-muted text-foreground",
              )}
              onClick={() => {
                persistViewMode("card");
                updateQueryParams({
                  view: "card",
                });
              }}
            >
              <LayoutGrid className="h-4 w-4" />
              {t("view.card")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-none",
                viewMode === "list" && "bg-muted text-foreground",
              )}
              onClick={() => {
                persistViewMode("list");
                updateQueryParams({
                  view: "list",
                });
              }}
            >
              <List className="h-4 w-4" />
              {t("view.list")}
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void fetchHistory()}
            className="rounded-lg"
            title={t("refresh")}
            aria-label={t("refresh")}
          >
            <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-20">
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">{t("empty")}</p>
        </div>
      ) : viewMode === "card" ? (
        <div className="mx-auto grid max-w-[120rem] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 [@media(min-width:2200px)]:grid-cols-6">
          {records.map((record) => {
            const imageResultUrls =
              record.category === "image"
                ? record.resultUrls.filter(
                    (url) => typeof url === "string" && url.length > 0,
                  )
                : [];

            return (
              <div
                key={record.id}
                className="group cursor-pointer rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md"
                onClick={() => setSelectedRecord(record)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedRecord(record);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div
                  className={cn(
                    "relative aspect-video bg-muted/50",
                  )}
                >
                  {record.status === "success" &&
                  (record.category === "image"
                    ? imageResultUrls.length > 0
                    : !!record.resultUrl) ? (
                    record.category === "image" ? (
                      imageResultUrls.length === 1 ? (
                        <img
                          src={imageResultUrls[0]}
                          alt={
                            record.prompt ||
                            record.modelLabel ||
                            formatModelName(record.model)
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full grid-cols-2 gap-0.5 bg-border/40 p-0.5">
                          {imageResultUrls.slice(0, 4).map((url, index) => {
                            const remainingCount =
                              index === 3 && imageResultUrls.length > 4
                                ? imageResultUrls.length - 4
                                : 0;

                            return (
                              <div
                                key={`${record.id}-${url}-${index}`}
                                className="relative overflow-hidden bg-muted"
                              >
                                <img
                                  src={url}
                                  alt={`${record.prompt || record.modelLabel || formatModelName(record.model)} ${index + 1}`}
                                  className="h-full w-full object-cover"
                                />
                                {remainingCount > 0 && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-medium text-white">
                                    +{remainingCount}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      <video
                        src={record.resultUrl ?? undefined}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        onMouseOver={(event) =>
                          (event.target as HTMLVideoElement).play()
                        }
                        onMouseOut={(event) => {
                          const video = event.target as HTMLVideoElement;
                          video.pause();
                          video.currentTime = 0;
                        }}
                      />
                    )
                  ) : record.status === "pending" ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      {record.category === "image" ? (
                        <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                      ) : (
                        <Film className="w-8 h-8 text-muted-foreground/40" />
                      )}
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(
                      record.status,
                      record.creditsRefunded,
                      record.category,
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-1">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 text-sm font-medium leading-5">
                        <span className="line-clamp-1">
                          {record.modelLabel || formatModelName(record.model)}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {record.isPublic
                          ? tLanding("form.public")
                          : tLanding("form.private")}
                      </span>
                    </div>

                    {record.creditsRefunded && (
                      <p className="text-[11px] text-emerald-600">
                        {t("credits_refunded")}
                      </p>
                    )}
                  </div>

                  <p className="text-[11px] leading-5 text-muted-foreground line-clamp-1">
                    {getTaskParamsLine(record)}
                  </p>

                  {record.prompt && (
                    <p className="text-sm leading-6 text-foreground/80 line-clamp-2">
                      {record.prompt}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                    <span className="shrink-0">
                      {formatCompactDateTime(record.createdAt)}
                    </span>
                    {renderUserActions(record, { stopPropagation: true })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.task")}</TableHead>
                <TableHead className="w-[300px] min-w-[300px] max-w-[300px]">
                  {t("columns.model")}
                </TableHead>
                <TableHead>{t("columns.preview")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.credits")}</TableHead>
                <TableHead>{t("columns.createdAt")}</TableHead>
                <TableHead>{t("columns.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => {
                const failureReason = getFailureReason(record);
                const durationSeconds = getDurationSeconds(record);

                return (
                  <TableRow
                    key={record.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <TableCell className="align-top">
                      <div className="space-y-1 font-mono text-xs">
                        {record.taskId ? (
                          <button
                            type="button"
                            className="break-all text-left font-mono text-xs transition-colors hover:text-foreground"
                            title={t("copy_task_id")}
                            onClick={async (event) => {
                              event.stopPropagation();
                              await handleCopyTaskId(record.taskId);
                            }}
                          >
                            {record.taskId}
                          </button>
                        ) : (
                          <span>—</span>
                        )}
                        <div className="flex items-center gap-2 font-sans">
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline underline-offset-4"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedPayload({
                                title: t("detail.request"),
                                value: record.requestPayload,
                              });
                            }}
                          >
                            {t("detail.request")}
                          </button>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline underline-offset-4"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedPayload({
                                title: t("detail.response"),
                                value: record.responsePayload ?? {},
                              });
                            }}
                          >
                            {t("detail.response")}
                          </button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top w-[300px] min-w-[300px] max-w-[300px]">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {record.modelLabel || formatModelName(record.model)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {record.category} · {record.provider || "-"}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {record.catalogModelId || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {record.resultUrls.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {record.resultUrls.map((url, index) => (
                            <a
                              key={`${record.id}-${index}`}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded-md border bg-muted transition-opacity hover:opacity-80"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {record.category === "image" ? (
                                <img
                                  src={url}
                                  alt={`${record.modelLabel || formatModelName(record.model)} preview ${index + 1}`}
                                  className="h-8 w-12 object-cover"
                                />
                              ) : (
                                <video
                                  src={url}
                                  className="h-8 w-12 object-cover"
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              )}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              record.status === "success" &&
                                "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
                              record.status === "failed" &&
                                "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400",
                              record.status === "pending" &&
                                "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
                            )}
                          >
                            {record.status === "success"
                              ? t("status.success")
                              : record.status === "failed"
                                ? t("status.failed")
                                : t("status.pending")}
                          </Badge>
                          {record.status === "failed" ? (
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline underline-offset-4"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedPayload({
                                  title: t("failure_reason"),
                                  value: failureReason,
                                });
                              }}
                            >
                              {t("view_reason")}
                            </button>
                          ) : null}
                        </div>
                        <Badge variant={record.isPublic ? "default" : "outline"}>
                          {record.isPublic
                            ? tLanding("form.public")
                            : tLanding("form.private")}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col text-sm">
                        <span>Reserved {record.creditsRequired ?? record.creditsUsed}</span>
                        <span className="text-muted-foreground">
                          Refunded{" "}
                          {record.creditsRefunded
                            ? (record.creditsRequired ?? record.creditsUsed)
                            : 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      <div className="flex flex-col gap-0.5">
                        <span>{formatTableDateTime(record.createdAt)}</span>
                        <span>{formatTableDateTime(record.completedAt)}</span>
                        <span>
                          {t("columns.duration")}：
                          {durationSeconds == null ? "-" : `${durationSeconds}s`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className="align-top"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {renderUserActions(record, {
                        compact: true,
                        stopPropagation: true,
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={Boolean(selectedPayload)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPayload(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedPayload?.title}</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[70vh] overflow-auto rounded-md bg-muted p-4 text-xs leading-5">
            {formatJsonBlock(selectedPayload?.value ?? {})}
          </pre>
        </DialogContent>
      </Dialog>

      <Drawer
        open={!!selectedRecord}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecord(null);
          }
        }}
        direction="right"
      >
        <DrawerContent className="overflow-hidden p-0 data-[vaul-drawer-direction=right]:h-full data-[vaul-drawer-direction=right]:w-[92vw] data-[vaul-drawer-direction=right]:sm:max-w-3xl">
          {selectedRecord && (
            <div className="flex h-full min-h-0 flex-col">
              <DrawerHeader className="gap-3 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <DrawerTitle>
                      {selectedRecord.modelLabel ||
                        formatModelName(selectedRecord.model)}
                    </DrawerTitle>
                    <DrawerDescription>
                      {formatCompactDateTime(selectedRecord.createdAt)}
                    </DrawerDescription>
                  </div>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={t("detail.close")}>
                      <X className="w-4 h-4" />
                    </Button>
                  </DrawerClose>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(
                    selectedRecord.status,
                    selectedRecord.creditsRefunded,
                    selectedRecord.category,
                  )}
                  <Badge variant="secondary">
                    {selectedRecord.isPublic
                      ? tLanding("form.public")
                      : tLanding("form.private")}
                  </Badge>
                </div>
              </DrawerHeader>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-6 p-4">
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold">{t("detail.preview")}</h3>
                    {selectedRecord.status === "success" ? (
                      selectedRecord.category === "image" ? (
                        selectedRecord.resultUrls.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {selectedRecord.resultUrls.map((url, index) => (
                              <button
                                key={`${selectedRecord.id}-result-${url}-${index}`}
                                type="button"
                                className="overflow-hidden rounded-lg border bg-muted text-left"
                                onClick={() => handleOpenImage(url)}
                              >
                                <img
                                  src={url}
                                  alt={`${selectedRecord.prompt || selectedRecord.modelLabel || formatModelName(selectedRecord.model)} ${index + 1}`}
                                  className="aspect-video h-full w-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            {t("detail.empty_result")}
                          </div>
                        )
                      ) : selectedRecord.resultUrl ? (
                        <div className="overflow-hidden rounded-lg border bg-black">
                          <video
                            src={selectedRecord.resultUrl}
                            className="aspect-video w-full"
                            controls
                            playsInline
                          />
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          {t("detail.empty_result")}
                        </div>
                      )
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        {t("detail.empty_result")}
                      </div>
                    )}
                  </section>

                  <Separator />

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold">{t("detail.basic_info")}</h3>
                    <div className="space-y-1">
                      {detailRows.map((item) => (
                        <div
                          key={item.key}
                          className="grid grid-cols-[108px_minmax(0,1fr)_auto] items-start gap-3 border-b border-border/50 py-1.5 text-sm last:border-b-0"
                        >
                          <span className="pt-1 text-xs text-muted-foreground">
                            {item.label}
                          </span>
                          <span
                            className={cn(
                              "break-all leading-6",
                              (item.key === "id" || item.key === "task_id") &&
                                "font-mono text-xs",
                            )}
                          >
                            {item.value}
                          </span>
                          {item.copyValue ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                if (!item.copyValue) {
                                  return;
                                }
                                void copyText(
                                  item.copyValue,
                                  item.copySuccessMessage || t("copy"),
                                );
                              }}
                            >
                              <Copy className="w-3 h-3" />
                              {t("copy")}
                            </Button>
                          ) : (
                            <span />
                          )}
                        </div>
                      ))}

                      <div className="grid grid-cols-[108px_minmax(0,1fr)_auto] items-start gap-3 border-b border-border/50 py-1.5 text-sm last:border-b-0">
                        <span className="pt-1 text-xs text-muted-foreground">
                          {t("detail.fields.prompt")}
                        </span>
                        <span className="whitespace-pre-wrap break-words leading-6">
                          {selectedRecord.prompt || "-"}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          disabled={!selectedRecord.prompt}
                          onClick={() => void handleCopyPrompt(selectedRecord.prompt)}
                        >
                          <Copy className="w-3 h-3" />
                          {t("copy")}
                        </Button>
                      </div>
                    </div>
                  </section>

                  {selectedRecord.status === "failed" ? (
                    <>
                      <Separator />
                      <section className="space-y-3">
                        <h3 className="text-sm font-semibold">{t("failure_reason")}</h3>
                        <pre className="max-h-[280px] overflow-auto rounded-md border bg-muted/20 px-3 py-2 text-sm leading-6 text-rose-700 dark:text-rose-300">
                          {selectedFailureReason}
                        </pre>
                      </section>
                    </>
                  ) : null}

                  {(selectedRecord.uploadedImages?.length ||
                    selectedRecord.inputVideos?.length ||
                    selectedRecord.resultUrls.length > 0) && (
                    <>
                      <Separator />
                      <section className="space-y-4">
                        {selectedRecord.uploadedImages?.length ? (
                          <div className="space-y-2">
                            <h3 className="text-sm font-semibold">
                              {t("detail.uploaded_images")}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedRecord.uploadedImages.map((url, index) => (
                                <button
                                  key={`${selectedRecord.id}-upload-${url}-${index}`}
                                  type="button"
                                  className="overflow-hidden rounded-lg border bg-muted"
                                  onClick={() => handleOpenImage(url)}
                                >
                                  <img
                                    src={url}
                                    alt={`${t("detail.uploaded_images")} ${index + 1}`}
                                    className="h-20 w-20 object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {selectedRecord.inputVideos?.length ? (
                          <div className="space-y-2">
                            <h3 className="text-sm font-semibold">
                              {t("detail.input_videos")}
                            </h3>
                            <div className="space-y-2">
                              {selectedRecord.inputVideos.map((url, index) => (
                                <video
                                  key={`${selectedRecord.id}-input-video-${url}-${index}`}
                                  src={url}
                                  className="w-full rounded-lg border bg-black"
                                  controls
                                  playsInline
                                />
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {selectedRecord.resultUrls.length > 0 ? (
                          <div className="space-y-2">
                            <h3 className="text-sm font-semibold">
                              {t("detail.result_urls")}
                            </h3>
                            <div className="space-y-2">
                              {selectedRecord.resultUrls.map((url, index) => (
                                <a
                                  key={`${selectedRecord.id}-result-link-${url}-${index}`}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block rounded-lg border bg-muted/30 px-3 py-2 text-sm text-foreground/80 underline-offset-4 hover:underline"
                                >
                                  {url}
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </section>
                    </>
                  )}

                  <Separator />

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">{t("detail.request")}</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => void handleCopyRequest(selectedRecord.requestPayload)}
                      >
                        <Copy className="w-3 h-3" />
                        {t("copy_request")}
                      </Button>
                    </div>
                    <pre className="max-h-[360px] overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
                      {formatJsonBlock(selectedRecord.requestPayload)}
                    </pre>
                  </section>

                  <Separator />

                  <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold">{t("detail.response")}</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() =>
                          void handleCopyResponse(selectedRecord.responsePayload)
                        }
                        disabled={selectedRecord.responsePayload == null}
                      >
                        <Copy className="w-3 h-3" />
                        {t("copy_response")}
                      </Button>
                    </div>
                    {selectedRecord.responsePayload ? (
                      <pre className="max-h-[360px] overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
                        {formatJsonBlock(selectedRecord.responsePayload)}
                      </pre>
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        {t("detail.empty_response")}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-center text-sm text-muted-foreground sm:text-left">
            {t("pagination.total_records", { count: totalCount })}
          </span>
          <div className="flex flex-row items-center gap-6">
            <span className="text-sm text-muted-foreground">
              {t("pagination.page_of", {
                current: page,
                total: totalPages,
              })}
            </span>
            <Pagination className="mx-0 w-auto">
              <PaginationContent className="flex-wrap justify-center">
                <PaginationItem>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateQueryParams({
                        page: Math.max(1, page - 1),
                        status: statusFilter,
                        q: searchQuery,
                      })
                    }
                    disabled={page <= 1}
                    className="gap-1 rounded-lg px-2.5"
                    aria-label={t("pagination.previous")}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </PaginationItem>

                {paginationItems.map((item, index) => (
                  <PaginationItem key={`${item}-${index}`}>
                    {item === "ellipsis" ? (
                      <PaginationEllipsis />
                    ) : (
                      <Button
                        type="button"
                        variant={item === page ? "outline" : "ghost"}
                        size="sm"
                        onClick={() =>
                          updateQueryParams({
                            page: item,
                            status: statusFilter,
                            q: searchQuery,
                          })
                        }
                        aria-current={item === page ? "page" : undefined}
                        className="min-w-9 rounded-lg"
                      >
                        {item}
                      </Button>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateQueryParams({
                        page: Math.min(totalPages, page + 1),
                        status: statusFilter,
                        q: searchQuery,
                      })
                    }
                    disabled={page >= totalPages}
                    className="gap-1 rounded-lg px-2.5"
                    aria-label={t("pagination.next")}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
}
