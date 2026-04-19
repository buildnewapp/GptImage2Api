"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Loader2,
  MoreHorizontal,
  RefreshCcw,
  Settings,
  Trash2,
  Video,
  WandSparkles,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
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
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState<
    string | null
  >(null);
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
                const newStatus = mapTaskStateToLegacyStatus(
                  statusData.data.state,
                );
                if (newStatus !== "pending") {
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
                            creditsRefunded:
                              Number(statusData.data.refundedCredits ?? 0) >
                                0 || item.creditsRefunded,
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

        await navigator.clipboard.writeText(serialized);
        toast.success(t("request_copied"));
      } catch {
        toast.error(t("request_copy_failed"));
      }
    },
    [t],
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
          <Button
            key={status}
            type="button"
            variant={statusFilter === status ? "default" : "outline"}
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
            className={cn(
              "rounded-lg transition-all",
              statusFilter !== status &&
                "bg-card text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {status === "all" ? t("filter.all") : t(`status.${status}`)}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void fetchHistory()}
          className="ml-auto rounded-lg"
          title={t("refresh")}
          aria-label={t("refresh")}
        >
          <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-20">
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[120rem] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 [@media(min-width:2200px)]:grid-cols-6">
          {records.map((record) => {
            const visibilityDisabled =
              !record.visibilityAvailable || updatingVisibilityId === record.id;
            const imageResultUrls =
              record.category === "image"
                ? record.resultUrls.filter(
                    (url) => typeof url === "string" && url.length > 0,
                  )
                : [];

            return (
              <div
                key={record.id}
                className="group rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div
                  className={cn(
                    "relative aspect-video bg-muted/50",
                    (record.category === "video" ||
                      (record.category === "image" &&
                        imageResultUrls.length > 0)) &&
                      "cursor-pointer",
                  )}
                  onClick={() => {
                    if (record.category !== "video" || !record.resultUrl) {
                      return;
                    }

                    setExpandedItem(
                      expandedItem === record.id ? null : record.id,
                    );
                  }}
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
                          onClick={() => handleOpenImage(imageResultUrls[0]!)}
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
                                onClick={() => handleOpenImage(url)}
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
                        controls={expandedItem === record.id}
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

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="xs"
                          aria-label={t("columns.actions")}
                        >
                          <Settings className="w-3 h-3" />
                          {t("columns.actions")}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() =>
                            handleDownloadMedia(
                              record.resultUrl,
                              record.taskId,
                              record.category,
                            )
                          }
                          disabled={!record.resultUrl}
                        >
                          <Download className="w-4 h-4" />
                          {t("download")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            if (!record.taskId) {
                              return;
                            }

                            await navigator.clipboard.writeText(record.taskId);
                            toast.success(t("task_id_copied"));
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
                          onClick={() =>
                            void handleCopyRequest(record.requestPayload)
                          }
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
                          {record.isPublic
                            ? t("make_private")
                            : t("make_public")}
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm px-3">
              {t("pagination.page_of", {
                current: page,
                total: totalPages,
              })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
              className="rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
