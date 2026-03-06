"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  ExternalLink,
  Film,
  Loader2,
  RefreshCcw,
  Video,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

interface VideoGeneration {
  id: string;
  taskId: string;
  model: string;
  status: "pending" | "success" | "failed";
  creditsUsed: number;
  creditsRefunded: boolean;
  prompt: string | null;
  resultUrl: string | null;
  createdAt: string;
}

export default function VideoHistoryClient() {
  const t = useTranslations("VideoGeneration");
  const [records, setRecords] = useState<VideoGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);

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
        setRecords(data.data?.records || []);
        setTotalPages(data.data?.totalPages || 1);
        setTotalCount(data.data?.total || 0);
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
    return model
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
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">
                    {formatModelName(record.model)}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    {record.creditsUsed}
                    {record.creditsRefunded && (
                      <span className="text-emerald-500">
                        ({t("credits_refunded")})
                      </span>
                    )}
                  </span>
                </div>

                {/* Prompt */}
                {record.prompt && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {record.prompt}
                  </p>
                )}

                {/* Time & Actions */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {new Date(record.createdAt).toLocaleDateString()}
                  </span>
                  {record.status === "success" && record.resultUrl && (
                    <a
                      href={record.resultUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      {t("view_video")}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
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
