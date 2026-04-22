"use client";

import { PostListActions } from "@/components/cms/PostListActions";
import { Badge } from "@/components/ui/badge";
import { PostWithTags } from "@/types/cms";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { Pin } from "lucide-react";

const getStatusBadgeVariant = (
  status: string,
): "default" | "secondary" | "outline" | "destructive" => {
  switch (status) {
    case "published":
      return "default";
    case "draft":
      return "secondary";
    case "archived":
      return "outline";
    default:
      return "secondary";
  }
};

const getVisibilityBadgeVariant = (
  visibility: string,
): "default" | "secondary" | "outline" | "destructive" => {
  switch (visibility) {
    case "public":
      return "secondary";
    case "logged_in":
      return "outline";
    case "subscribers":
      return "default";
    default:
      return "secondary";
  }
};

export const columns: ColumnDef<PostWithTags>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => <div className="font-medium">{row.getValue("title")}</div>,
  },
  {
    accessorKey: "language",
    header: "Language",
    cell: ({ row }) => <Badge variant="outline">{row.getValue("language")}</Badge>,
  },
  {
    accessorKey: "isPinned",
    header: "Pinned",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.getValue("isPinned") ? <Pin className="h-4 w-4" /> : "-"}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>;
    },
  },
  {
    accessorKey: "visibility",
    header: "Visibility",
    cell: ({ row }) => {
      const visibility = row.getValue("visibility") as string;
      return (
        <Badge variant={getVisibilityBadgeVariant(visibility)}>
          {visibility}
        </Badge>
      );
    },
  },
  {
    accessorKey: "publishedAt",
    header: "Published",
    cell: ({ row }) => {
      const date = row.getValue("publishedAt") as string | Date;
      try {
        return date ? dayjs(date).format("YYYY-MM-DD HH:mm") : "-";
      } catch {
        return "-";
      }
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const post = row.original;
      return (
        <PostListActions
          post={post}
          config={{
            postType: "compare",
            editUrl: `/dashboard/compare/${post.id}/edit`,
            duplicateUrl: `/dashboard/compare/new?duplicatePostId=${post.id}`,
          }}
        />
      );
    },
  },
];
