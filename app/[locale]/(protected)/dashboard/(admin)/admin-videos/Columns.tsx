"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ColumnDef } from "@tanstack/react-table";
import { Clock, Copy, ImageIcon, Play, Video } from "lucide-react";
import { toast } from "sonner";

export type VideoGenerationRecord = {
  id: string;
  taskId: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  category: string;
  model: string;
  selectedModel: string;
  status: string;
  creditsUsed: number;
  creditsRefunded: boolean;
  inputParams: unknown;
  prompt: string | null;
  resultUrl: string | null;
  createdAt: string;
};

function InputParamsDialog({
  value,
  triggerText,
  title,
}: {
  value: unknown;
  triggerText: string;
  title: string;
}) {
  const jsonText = JSON.stringify(value ?? {}, null, 2);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-sm text-primary hover:underline underline-offset-4"
        >
          {triggerText}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-xs leading-5">
          {jsonText}
        </pre>
      </DialogContent>
    </Dialog>
  );
}

function ResultMediaDialog({
  resultUrl,
  category,
  triggerText,
  noPreviewText,
  title,
}: {
  resultUrl: string | null;
  category: string;
  triggerText: string;
  noPreviewText: string;
  title: string;
}) {
  if (!resultUrl) {
    return <span className="text-xs text-muted-foreground">{noPreviewText}</span>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative h-16 w-28 overflow-hidden rounded-md border border-border bg-muted"
          aria-label={triggerText}
        >
          {category === "image" ? (
            <img
              src={resultUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <video
              src={resultUrl}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          )}
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="h-4 w-4 text-white" />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-hidden rounded-md bg-black">
          {category === "image" ? (
            <img
              src={resultUrl}
              alt={title}
              className="max-h-[70vh] w-full object-contain"
            />
          ) : (
            <video
              src={resultUrl}
              className="max-h-[70vh] w-full"
              controls
              autoPlay
              playsInline
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const getColumns = (
  t: (key: string) => string,
): ColumnDef<VideoGenerationRecord>[] => [
  {
    accessorKey: "userEmail",
    header: () => t("columns.user"),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-sm font-medium truncate max-w-[200px]">
          {row.original.userName || "—"}
        </span>
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          {row.original.userEmail || "—"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "selectedModel",
    header: () => t("columns.selectedModel"),
    cell: ({ row }) => (
      <span className="text-sm font-medium">{row.original.selectedModel}</span>
    ),
  },
  {
    accessorKey: "category",
    header: () => t("columns.category"),
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.category === "image"
          ? t("columns.image")
          : t("columns.video")}
      </Badge>
    ),
  },
  {
    accessorKey: "model",
    header: () => t("columns.model"),
    cell: ({ row }) => {
      const model = row.getValue("model") as string;
      const taskId = row.original.taskId;
      return (
        <div className="flex flex-col gap-1.5">
          {taskId && (
            <span
              className="text-[10px] font-mono text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded w-fit cursor-pointer hover:bg-muted hover:text-foreground transition-colors flex items-center gap-1 border border-border/50"
              onClick={() => {
                navigator.clipboard.writeText(taskId);
                toast.success(t("task_id_copied"));
              }}
              title={t("copy_task_id")}
            >
              {taskId}
              <Copy className="w-2.5 h-2.5" />
            </span>
          )}
          <span className="text-sm font-mono">
            {model.replace("bytedance/", "").replace(/-/g, " ")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "inputParams",
    header: () => t("columns.inputParams"),
    cell: ({ row }) => (
      <InputParamsDialog
        value={row.original.inputParams}
        triggerText={t("columns.viewJson")}
        title={t("columns.inputParams")}
      />
    ),
  },
  {
    accessorKey: "resultUrl",
    header: () => t("columns.preview"),
    cell: ({ row }) => (
      <ResultMediaDialog
        resultUrl={row.original.resultUrl}
        category={row.original.category}
        triggerText={t("columns.openPreview")}
        noPreviewText={t("columns.noPreview")}
        title={t("columns.preview")}
      />
    ),
  },
  {
    accessorKey: "status",
    header: () => t("columns.status"),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      switch (status) {
        case "pending":
          return (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
              <Clock className="w-3 h-3 mr-1" />
              {t("status.pending")}
            </Badge>
          );
        case "success":
          return (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
              {row.original.category === "image" ? (
                <ImageIcon className="w-3 h-3 mr-1" />
              ) : (
                <Video className="w-3 h-3 mr-1" />
              )}
              {t("status.success")}
            </Badge>
          );
        case "failed":
          return (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
              {t("status.failed")}
            </Badge>
          );
        default:
          return <Badge variant="outline">{status}</Badge>;
      }
    },
  },
  {
    accessorKey: "creditsUsed",
    header: () => t("columns.credits"),
    cell: ({ row }) => {
      const credits = row.getValue("creditsUsed") as number;
      return <span className="font-mono text-sm">{credits}</span>;
    },
  },
  {
    accessorKey: "creditsRefunded",
    header: () => t("columns.refundStatus"),
    cell: ({ row }) => {
      const refunded = row.original.creditsRefunded;
      return refunded ? (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
        >
          {t("columns.refunded")}
        </Badge>
      ) : (
        <Badge variant="outline">{t("columns.notRefunded")}</Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: () => t("columns.createdAt"),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt") as string);
      return (
        <span className="text-sm text-muted-foreground">
          {date.toLocaleDateString()}{" "}
          {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      );
    },
  },
];
