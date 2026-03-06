"use client";

import { Badge } from "@/components/ui/badge";
import {
  ColumnDef,
} from "@tanstack/react-table";
import { Clock, Video } from "lucide-react";

export type VideoGenerationRecord = {
  id: string;
  taskId: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  model: string;
  status: string;
  creditsUsed: number;
  creditsRefunded: boolean;
  prompt: string | null;
  resultUrl: string | null;
  createdAt: string;
};

export const getColumns = (t: (key: string) => string): ColumnDef<VideoGenerationRecord>[] => [
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
    accessorKey: "model",
    header: () => t("columns.model"),
    cell: ({ row }) => {
      const model = row.getValue("model") as string;
      return (
        <span className="text-sm font-mono">
          {model.replace("bytedance/", "").replace(/-/g, " ")}
        </span>
      );
    },
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
              Pending
            </Badge>
          );
        case "success":
          return (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
              <Video className="w-3 h-3 mr-1" />
              Success
            </Badge>
          );
        case "failed":
          return (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
              Failed
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
      const refunded = row.original.creditsRefunded;
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{credits}</span>
          {refunded && (
            <Badge variant="secondary" className="text-xs">
              {t("columns.refunded")}
            </Badge>
          )}
        </div>
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
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      );
    },
  },
];
