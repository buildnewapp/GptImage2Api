"use client";

import { Badge } from "@/components/ui/badge";
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
  Loader2,
  RefreshCcw,
  Trash2,
  Video,
  WandSparkles,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type GenerationMode = "image-to-video" | "text-to-video";

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

export default function AiStudioVideoHistoryClient() {
  const t = useTranslations("VideoGeneration");
  const tLanding = useTranslations("Landing.Hero");
  const locale = useLocale();
  const router = useRouter();
  const [records, setRecords] = useState<VideoGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "12",
      });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
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

        pendingRecords.forEach((record: VideoGeneration) => {
          fetch(
            `/api/ai-studio/tasks/${record.providerTaskId}?modelId=${encodeURIComponent(
              record.catalogModelId!,
            )}`,
          )
            .then((response) => response.json())
            .then((statusData) => {
              if (statusData.success && statusData.data) {
                const newStatus = mapTaskStateToLegacyStatus(statusData.data.state);
                if (newStatus !== "pending") {
                  setRecords((current) =>
                    current.map((item) =>
                      item.id === record.id
                        ? {
                            ...item,
                            status: newStatus,
                            resultUrl: statusData.data.mediaUrls?.[0] || item.resultUrl,
                            creditsRefunded:
                              Number(statusData.data.refundedCredits ?? 0) > 0 ||
                              item.creditsRefunded,
                          }
                        : item,
                    ),
                  );
                }
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
  }, [page, statusFilter]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const getTaskParamsLine = useCallback(
    (record: VideoGeneration) => {
      const mode: GenerationMode =
        record.mode === "image-to-video" || (!record.mode && record.uploadedImage)
          ? "image-to-video"
          : "text-to-video";
      const parts: string[] = [
        mode === "image-to-video"
          ? tLanding("form.imageToVideo")
          : tLanding("form.textToVideo"),
      ];

      if (record.providerValues?.resolution) {
        parts.push(`${tLanding("form.resolution")}: ${record.providerValues.resolution}`);
      }
      if (record.providerValues?.aspectRatio) {
        parts.push(`${tLanding("form.aspectRatio")}: ${record.providerValues.aspectRatio}`);
      }
      if (record.providerValues?.duration) {
        parts.push(`${tLanding("form.duration")}: ${record.providerValues.duration}`);
      }
      if (record.providerValues?.seed) {
        parts.push(`${tLanding("form.seed")}: ${record.providerValues.seed}`);
      }
      parts.push(record.isPublic ? tLanding("form.public") : tLanding("form.private"));

      return parts.join(" · ");
    },
    [tLanding],
  );

  const handleDownloadVideo = useCallback((url: string | null, taskId: string) => {
    if (!url) {
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = `video-task-${taskId || Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
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

      router.push(`/${locale}/seedance2`);
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

        const nextPage =
          records.length === 1 && page > 1 ? page - 1 : page;
        if (nextPage !== page) {
          setPage(nextPage);
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
    [deletingId, fetchHistory, page, records.length, t],
  );

  const getStatusBadge = (status: string, refunded: boolean) => {
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
            <Video className="w-3 h-3 mr-1" />
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
    const sanitized = model.includes("/") ? model.split("/").at(-1) || model : model;
    return sanitized
      .replace("bytedance/", "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
      <div className="flex flex-wrap items-center gap-3">
        {["all", "pending", "success", "failed"].map((status) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
              statusFilter === status
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {status === "all" ? t("filter.all") : t(`status.${status}`)}
          </button>
        ))}
        <button
          onClick={() => void fetchHistory()}
          className="ml-auto p-2 rounded-lg border border-border hover:bg-muted transition-colors"
          title="Refresh"
        >
          <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-20">
          <Film className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[120rem] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 [@media(min-width:2200px)]:grid-cols-6">
          {records.map((record) => {
            const visibilityDisabled =
              !record.visibilityAvailable || updatingVisibilityId === record.id;

            return (
              <div
                key={record.id}
                className="group rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div
                  className="relative aspect-video bg-muted/50 cursor-pointer"
                  onClick={() =>
                    setExpandedVideo(expandedVideo === record.id ? null : record.id)
                  }
                >
                  {record.status === "success" && record.resultUrl ? (
                    <video
                      src={record.resultUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      controls={expandedVideo === record.id}
                      onMouseOver={(event) =>
                        (event.target as HTMLVideoElement).play()
                      }
                      onMouseOut={(event) => {
                        const video = event.target as HTMLVideoElement;
                        video.pause();
                        video.currentTime = 0;
                      }}
                    />
                  ) : record.status === "pending" ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Film className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    {getStatusBadge(record.status, record.creditsRefunded)}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {record.modelLabel || formatModelName(record.model)}
                      </span>
                      {record.taskId && (
                        <span
                          className="font-mono text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted transition-colors flex items-center gap-1 shrink-0 border border-border/50"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigator.clipboard.writeText(record.taskId);
                            toast.success("Task ID copied");
                          }}
                          title="Copy Task ID"
                        >
                          {record.taskId}
                          <Copy className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    {record.creditsRefunded && (
                      <span className="text-xs text-emerald-500 shrink-0">
                        ({t("credits_refunded")})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {tLanding("form.creditsRequired", {
                      count: record.creditsRequired ?? record.creditsUsed,
                    })}
                    {" · "}
                    {getTaskParamsLine(record)}
                  </p>

                  {record.prompt && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {record.prompt}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadVideo(record.resultUrl, record.taskId)}
                      disabled={!record.resultUrl}
                      className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] disabled:opacity-50"
                    >
                      <Download className="w-3 h-3" />
                      {t("download")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopyPrompt(record.prompt)}
                      disabled={!record.prompt}
                      className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] disabled:opacity-50"
                    >
                      <Copy className="w-3 h-3" />
                      {t("copy")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleVisibility(record)}
                      disabled={visibilityDisabled}
                      className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] disabled:opacity-50"
                    >
                      {updatingVisibilityId === record.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : record.isPublic ? (
                        <EyeOff className="w-3 h-3" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                      {record.isPublic ? t("make_private") : t("make_public")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemix(record)}
                      disabled={!record.modelKey || !record.versionKey}
                      className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] disabled:opacity-50"
                    >
                      <WandSparkles className="w-3 h-3" />
                      {tLanding("form.remix")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(record)}
                      disabled={deletingId === record.id}
                      className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] disabled:opacity-50"
                    >
                      {deletingId === record.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      {t("delete")}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                    <span>{new Date(record.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">
            {t("pagination.total_records", { count: totalCount })}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm px-3">
              {t("pagination.page_of", {
                current: page,
                total: totalPages,
              })}
            </span>
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
