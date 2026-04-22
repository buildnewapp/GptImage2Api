"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { getColumns, type VideoGenerationRecord } from "./Columns";

interface DataTableProps {
  data: {
    records: VideoGenerationRecord[];
    total: number;
    totalPages: number;
    page: number;
  };
}

export function DataTable({ data }: DataTableProps) {
  const t = useTranslations("AdminVideoGenerations");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");

  const columns = getColumns(t);

  const table = useReactTable({
    data: data.records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const updateParams = useCallback(
    (params: Record<string, string | undefined>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          sp.set(key, value);
        } else {
          sp.delete(key);
        }
      });
      router.push(`${pathname}?${sp.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const currentStatus = searchParams.get("status") || "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {["all", "pending", "success", "failed"].map((status) => (
          <button
            key={status}
            onClick={() =>
              updateParams({
                status: status === "all" ? undefined : status,
                page: undefined,
              })
            }
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
              currentStatus === status
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {status === "all" ? t("filters.all_statuses") : t(`status.${status}`)}
          </button>
        ))}

        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                updateParams({
                  search: searchInput || undefined,
                  page: undefined,
                });
              }
            }}
            placeholder={t("filters.search")}
            className="pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm w-[280px] focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-10 text-muted-foreground"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {t("pagination.page_info", {
            current: data.page,
            total: data.totalPages,
            count: data.total,
          })}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              updateParams({ page: String(Math.max(1, data.page - 1)) })
            }
            disabled={data.page <= 1}
            className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              updateParams({
                page: String(Math.min(data.totalPages, data.page + 1)),
              })
            }
            disabled={data.page >= data.totalPages}
            className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
