"use client";

import type { AdminCreditHistoryRecord } from "@/actions/usage/admin";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";

function formatLogType(type: string) {
  switch (type) {
    case "one_time_purchase":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          One-time Purchase
        </Badge>
      );
    case "subscription_grant":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          Subscription Grant
        </Badge>
      );
    case "feature_usage":
      return <Badge variant="secondary">Feature Usage</Badge>;
    case "refund_revoke":
      return <Badge variant="destructive">Refund Revoke</Badge>;
    case "subscription_ended_revoke":
      return <Badge variant="destructive">Subscription Ended Revoke</Badge>;
    case "welcome_bonus":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          Welcome Bonus
        </Badge>
      );
    case "referral_signup_bonus":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          Referral Signup Bonus
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

export function getAdminCreditHistoryColumns({
  showUserColumn,
}: {
  showUserColumn: boolean;
}): ColumnDef<AdminCreditHistoryRecord>[] {
  const columns: ColumnDef<AdminCreditHistoryRecord>[] = [];

  if (showUserColumn) {
    columns.push({
      id: "user",
      header: "User",
      cell: ({ row }) => (
        <div className="flex min-w-[180px] flex-col">
          <span className="font-medium">{row.original.user?.name || "-"}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.user?.email || row.original.userId}
          </span>
        </div>
      ),
    });
  }

  columns.push(
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => (
        <div>{dayjs(row.getValue("createdAt")).format("YYYY-MM-DD HH:mm:ss")}</div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => formatLogType(row.getValue("type")),
    },
    {
      accessorKey: "notes",
      header: "Details",
      cell: ({ row }) => {
        const value = row.getValue("notes") as string | null;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="max-w-[260px] truncate">{value || "-"}</div>
              </TooltipTrigger>
              <TooltipContent>{value || "-"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = Number(row.getValue("amount"));
        const formatted = amount > 0 ? `+${amount}` : `${amount}`;

        return (
          <div className={amount > 0 ? "font-medium text-green-600" : "font-medium text-destructive"}>
            {formatted}
          </div>
        );
      },
    },
    {
      accessorKey: "oneTimeCreditsSnapshot",
      header: "One-Time Balance After",
    },
    {
      accessorKey: "subscriptionCreditsSnapshot",
      header: "Subscription Balance After",
    },
  );

  return columns;
}
