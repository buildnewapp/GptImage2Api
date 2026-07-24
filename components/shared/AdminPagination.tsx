"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type AdminPaginationLabels = {
  first: string;
  previous: string;
  next: string;
  last: string;
  perPage: string;
  range: string;
};

type AdminPaginationProps = {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  pageCount?: number;
  totalLabel?: string;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  disabled?: boolean;
  pageSizeOptions?: number[];
  labels?: AdminPaginationLabels;
  className?: string;
  onPageIndexChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function AdminPagination({
  pageIndex,
  pageSize,
  totalCount,
  pageCount: pageCountProp,
  totalLabel,
  canGoNext,
  canGoPrevious,
  disabled = false,
  pageSizeOptions = [10, 20, 100],
  labels,
  className,
  onPageIndexChange,
  onPageSizeChange,
}: AdminPaginationProps) {
  const safePageSize = pageSize > 0 ? pageSize : pageSizeOptions[0] || 10;
  const pageCount = Math.max(
    1,
    pageCountProp ?? Math.ceil(totalCount / safePageSize),
  );
  const currentPageIndex = Math.min(Math.max(pageIndex, 0), pageCount - 1);
  const hasPreviousPage = canGoPrevious ?? currentPageIndex > 0;
  const hasNextPage = canGoNext ?? currentPageIndex < pageCount - 1;
  const pageWindowStart = Math.min(
    Math.max(currentPageIndex - 2, 0),
    Math.max(pageCount - 5, 0),
  );
  const pageNumbers = Array.from(
    { length: Math.min(pageCount, 5) },
    (_, index) => pageWindowStart + index,
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-3 pt-4 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
        <span>
          {totalLabel ??
            labels?.range ??
            `第 ${currentPageIndex + 1} / ${pageCount} 页，共 ${totalCount} 条`}
        </span>
        <div className="flex items-center gap-2">
          <span>{labels?.perPage ?? "每页"}</span>
          <Select
            value={String(safePageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[84px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {labels ? null : <span>条</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageIndexChange(0)}
          disabled={!hasPreviousPage || disabled}
        >
          {labels?.first ?? "首页"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageIndexChange(Math.max(0, currentPageIndex - 1))}
          disabled={!hasPreviousPage || disabled}
        >
          {labels?.previous ?? "上一页"}
        </Button>
        {pageNumbers.map((pageNumber) => (
          <Button
            key={pageNumber}
            variant={pageNumber === currentPageIndex ? "default" : "outline"}
            size="sm"
            onClick={() => onPageIndexChange(pageNumber)}
            disabled={disabled}
            className="min-w-9"
          >
            {pageNumber + 1}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onPageIndexChange(Math.min(pageCount - 1, currentPageIndex + 1))
          }
          disabled={!hasNextPage || disabled}
        >
          {labels?.next ?? "下一页"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageIndexChange(pageCount - 1)}
          disabled={!hasNextPage || disabled}
        >
          {labels?.last ?? "尾页"}
        </Button>
      </div>
    </div>
  );
}
