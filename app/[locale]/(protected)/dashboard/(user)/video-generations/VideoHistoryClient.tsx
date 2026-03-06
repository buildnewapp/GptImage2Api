"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { VIDEO_REMIX_STORAGE_KEY, type VideoRemixPayload } from "@/lib/video/remix";
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
  Video,
  WandSparkles,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type GenerationMode = "image-to-video" | "text-to-video";

interface VideoGeneration {
  id: string;
  taskId: string;
  model: string;
  modelLabel?: string | null;
  modelKey?: string | null;
  versionLabel?: string | null;
  versionKey?: string | null;
  providerKey?: string | null;
  mode?: GenerationMode;
  providerValues?: {
    prompt?: string;
    imageUrl?: string;
    resolution?: string;
    aspectRatio?: string;
    duration?: string;
    seed?: string;
    cameraFixed?: boolean;
    enableSafetyChecker?: boolean;
  };
  uploadedImage?: string | null;
  modelDisplay?: string;
  status: "pending" | "success" | "failed";
  creditsUsed: number;
  creditsRequired?: number;
  creditsRefunded: boolean;
  isPublic: boolean;
  prompt: string | null;
  resultUrl: string | null;
  createdAt: string;
}

export default function VideoHistoryClient() {
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

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "12",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/video/history?${params}`);
      const data = await res.json();

      if (data.success) {
        const fetchedRecords = data.data?.records || [];
        setRecords(fetchedRecords);
        setTotalPages(data.data?.totalPages || 1);
        setTotalCount(data.data?.total || 0);

        // Auto-fetch status for pending videos once
        const pendingRecords = fetchedRecords.filter((r: VideoGeneration) => r.status === "pending");
        if (pendingRecords.length > 0) {
          pendingRecords.forEach((record: VideoGeneration) => {
            fetch(`/api/video/status?taskId=${record.taskId}`)
              .then((res) => res.json())
              .then((statusData) => {
                if (statusData.success && statusData.data) {
                  const newStatus = statusData.data.status;
                  if (newStatus !== "pending") {
                    setRecords((prev) =>
                      prev.map((p) =>
                        p.taskId === record.taskId
                          ? {
                            ...p,
                            status: newStatus,
                            resultUrl: statusData.data.resultUrls?.[0] || p.resultUrl,
                            creditsRefunded: statusData.data.creditsRefunded || p.creditsRefunded,
                          }
                          : p
                      )
                    );
                  }
                }
              })
              .catch(() => {
                // silently fail status fetch
              });
          });
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchHistory();
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
    if (!url) return;

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
      if (!prompt) return;

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
      const payload: VideoRemixPayload = {
        mode:
          record.mode === "image-to-video" || (!record.mode && record.uploadedImage)
            ? "image-to-video"
            : "text-to-video",
        modelKey:
          typeof record.modelKey === "string" ? record.modelKey : undefined,
        versionKey:
          typeof record.versionKey === "string" ? record.versionKey : undefined,
        providerKey: record.providerKey === "office" ? "office" : undefined,
        isPublic: record.isPublic,
        providerValues: {
          prompt: record.prompt ?? "",
          imageUrl: record.uploadedImage ?? undefined,
          resolution: record.providerValues?.resolution,
          aspectRatio: record.providerValues?.aspectRatio,
          duration: record.providerValues?.duration,
          seed: record.providerValues?.seed,
          cameraFixed: record.providerValues?.cameraFixed,
          enableSafetyChecker: record.providerValues?.enableSafetyChecker,
        },
      };

      window.localStorage.setItem(VIDEO_REMIX_STORAGE_KEY, JSON.stringify(payload));
      router.push(`/${locale}/seedance2?remix=1`);
    },
    [locale, router],
  );

  const handleToggleVisibility = useCallback(
    async (record: VideoGeneration) => {
      if (updatingVisibilityId) return;

      const nextIsPublic = !record.isPublic;
      setUpdatingVisibilityId(record.id);

      try {
        const res = await fetch("/api/video/history", {
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

        setRecords((prev) =>
          prev.map((item) =>
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
      .replace(/\b\w/g, (l) => l.toUpperCase());
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
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {["all", "pending", "success", "failed"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
              statusFilter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {s === "all" ? t("filter.all") : t(`status.${s}`)}
          </button>
        ))}
        <button
          onClick={fetchHistory}
          className="ml-auto p-2 rounded-lg border border-border hover:bg-muted transition-colors"
          title="Refresh"
        >
          <RefreshCcw
            className={cn("w-4 h-4", loading && "animate-spin")}
          />
        </button>
      </div>

      {/* Records Grid */}
      {records.length === 0 ? (
        <div className="text-center py-20">
          <Film className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((record) => (
            <div
              key={record.id}
              className="group rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Video Preview */}
              <div
                className="relative aspect-video bg-muted/50 cursor-pointer"
                onClick={() =>
                  setExpandedVideo(
                    expandedVideo === record.id ? null : record.id
                  )
                }
              >
                {record.status === "success" && record.resultUrl ? (
                  <video
                    src={record.resultUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    controls={expandedVideo === record.id}
                    onMouseOver={(e) =>
                      (e.target as HTMLVideoElement).play()
                    }
                    onMouseOut={(e) => {
                      const v = e.target as HTMLVideoElement;
                      v.pause();
                      v.currentTime = 0;
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

              {/* Card Info */}
              <div className="p-4 space-y-3">
                {/* Model Name */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">
                      {record.modelLabel || record.modelDisplay || formatModelName(record.model)}
                    </span>
                    {record.taskId && (
                      <span
                        className="font-mono text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted transition-colors flex items-center gap-1 shrink-0 border border-border/50"
                        onClick={(e) => {
                          e.stopPropagation();
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

                {/* Prompt */}
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
                    disabled={updatingVisibilityId === record.id}
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
                    className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px]"
                  >
                    <WandSparkles className="w-3 h-3" />
                    {tLanding("form.remix")}
                  </button>
                </div>

                {/* Time */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {new Date(record.createdAt).toLocaleDateString()}
                  </span>
                  <span>{new Date(record.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">
            {t("pagination.total_records", { count: totalCount })}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
