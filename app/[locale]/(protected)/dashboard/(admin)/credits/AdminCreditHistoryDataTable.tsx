"use client";

import {
  type AdminCreditHistoryRecord,
  getAdminCreditHistory,
} from "@/actions/usage/admin";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  flexRender,
  getCoreRowModel,
  PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getAdminCreditHistoryColumns } from "./AdminCreditHistoryColumns";

export function AdminCreditHistoryDataTable({
  userId,
  initialData,
  initialTotalCount,
  pageSize = 20,
}: {
  userId?: string;
  initialData: AdminCreditHistoryRecord[];
  initialTotalCount: number;
  pageSize?: number;
}) {
  const [data, setData] = useState(initialData);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageCount = useMemo(
    () => Math.ceil(totalCount / pagination.pageSize),
    [totalCount, pagination.pageSize],
  );

  useEffect(() => {
    if (pagination.pageIndex === 0) {
      setData(initialData);
      setTotalCount(initialTotalCount);
      return;
    }

    const fetchPage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getAdminCreditHistory({
          userId,
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
        });

        if (!result.success || !result.data) {
          throw new Error(
            ("error" in result && result.error) || "Failed to load credit history.",
          );
        }

        setData(result.data.logs);
        setTotalCount(result.data.count);
      } catch (error: any) {
        const message = error?.message || "Failed to load credit history.";
        setError(message);
        toast.error("Error", {
          description: message,
        });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPage();
  }, [initialData, initialTotalCount, pagination.pageIndex, pagination.pageSize, userId]);

  const columns = useMemo(
    () =>
      getAdminCreditHistoryColumns({
        showUserColumn: !userId,
      }),
    [userId],
  );

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
  });

  return (
    <div className="space-y-4">
      {error ? (
        <div className="flex items-center gap-2 rounded border border-red-400 bg-red-100 p-4 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="relative max-h-[calc(100vh-270px)] min-h-[200px] overflow-y-auto rounded-md border">
        {isLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-xs">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : null}
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
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No credit logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)} ({totalCount} Logs)
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
