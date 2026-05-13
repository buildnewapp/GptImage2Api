"use client";

import { deleteR2File, listR2Files, R2File } from "@/actions/r2-resources";
import { AdminPagination } from "@/components/shared/AdminPagination";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ADMIN_UPLOAD_IMAGE_PATH } from "@/config/common";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { getColumns } from "./Columns";
import { UploadImageDialog } from "./UploadImageDialog";

interface ImagesDataTableProps {
  initialData: R2File[];
  initialHasMore: boolean;
  initialTokenMap: Record<number, string | null>;
  categoryPrefix: string;
  r2PublicUrl?: string;
  pageSize: number;
}

export function ImagesDataTable({
  initialData,
  initialHasMore,
  initialTokenMap = {},
  categoryPrefix,
  r2PublicUrl,
  pageSize: initialPageSize,
}: ImagesDataTableProps) {
  const [filter, setFilter] = useState("");
  const [debouncedFilter] = useDebounce(filter, 500);

  const [files, setFiles] = useState<R2File[]>(initialData);
  const pageTokensRef = useRef<Record<number, string | null>>(initialTokenMap);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(initialPageSize);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [sorting, setSorting] = useState<SortingState>([]);

  const handleFetchError = (errMessage: string) => {
    setError(errMessage);
    toast.error("Failed to fetch files", { description: errMessage });
    setFiles([]);
    setHasMore(false);
    setIsLoading(false);
  };

  const fetchFiles = useCallback(
    async (pageIndex: number) => {
      const tokenForThisPage =
        pageIndex === 0 ? undefined : pageTokensRef.current[pageIndex - 1];

      if (pageIndex > 0 && tokenForThisPage === undefined) {
        console.warn(`Token missing for page ${pageIndex}. Fetch aborted.`);
        setHasMore(false);
        return null;
      }

      try {
        const result = await listR2Files({
          categoryPrefix: categoryPrefix,
          filterPrefix: debouncedFilter,
          continuationToken: tokenForThisPage ?? undefined,
          pageSize: currentPageSize,
        });

        if (!result.success || !result.data) {
          throw new Error(result.error);
        }

        const { files: fetchedFiles, nextContinuationToken } = result.data;
        setFiles(fetchedFiles);

        pageTokensRef.current = {
          ...pageTokensRef.current,
          [pageIndex]: nextContinuationToken ?? null,
        };

        setHasMore(nextContinuationToken !== undefined);
        return result.data;
      } catch (err: any) {
        handleFetchError(
          err.message || "An unknown error occurred during fetch",
        );
        return null;
      }
    },
    [categoryPrefix, debouncedFilter, currentPageSize],
  );

  useEffect(() => {
    if (isDeleting) {
      return;
    }

    const performFetch = async () => {
      setIsLoading(true);
      setError(null);
      await fetchFiles(currentPageIndex);
      setIsLoading(false);
    };

    performFetch();
  }, [
    currentPageIndex,
    categoryPrefix,
    debouncedFilter,
    isDeleting,
    currentPageSize,
    fetchFiles,
  ]);

  useEffect(() => {
    setCurrentPageIndex(0);
    pageTokensRef.current = {};
    setHasMore(true);
    setFiles([]);
    setError(null);
  }, [categoryPrefix, debouncedFilter]);

  const handleDelete = useCallback(
    async (key: string) => {
      setIsDeleting(true);
      const deleteOpResult = await deleteR2File(key);

      if (deleteOpResult.success) {
        toast.success(`Successfully deleted ${key}`);
        setIsLoading(true);
        setError(null);

        await fetchFiles(currentPageIndex);

        setIsLoading(false);
        setIsDeleting(false);
      } else {
        toast.error(`Failed to delete ${key}`, {
          description: deleteOpResult.error,
        });
        setIsDeleting(false);
      }
    },
    [currentPageIndex, fetchFiles],
  );

  const columns = useMemo(
    () => getColumns(r2PublicUrl, handleDelete),
    [r2PublicUrl, handleDelete],
  );

  const table = useReactTable({
    data: files,
    columns,
    pageCount: -1,
    state: {
      pagination: { pageIndex: currentPageIndex, pageSize: currentPageSize },
      sorting,
    },
    onPaginationChange: (updater) => {
      const newPageIndex =
        typeof updater === "function"
          ? updater(table.getState().pagination).pageIndex
          : updater.pageIndex;
      if (newPageIndex !== currentPageIndex) {
        setCurrentPageIndex(newPageIndex);
      }
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    debugTable: process.env.NODE_ENV === "development",
  });

  const canGoNext = hasMore;
  const canGoPrevious = currentPageIndex > 0;
  const knownTotalCount = currentPageIndex * currentPageSize + files.length;
  const paginationPageCount = hasMore
    ? currentPageIndex + 2
    : currentPageIndex + 1;

  const handleUploadSuccess = async () => {
    setCurrentPageIndex(0);
    pageTokensRef.current = {};
    setHasMore(true);
    setFiles([]);
    setError(null);

    setIsLoading(true);
    await fetchFiles(0);
    setIsLoading(false);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setCurrentPageSize(nextPageSize);
    setCurrentPageIndex(0);
    pageTokensRef.current = {};
    setHasMore(true);
    setFiles([]);
    setError(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filter by filename prefix..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
          disabled={isLoading || isDeleting}
        />
        {(categoryPrefix === "" ||
          categoryPrefix === `${ADMIN_UPLOAD_IMAGE_PATH}/`) && (
          <UploadImageDialog
            onUploadSuccess={handleUploadSuccess}
            uploadPath={ADMIN_UPLOAD_IMAGE_PATH}
            categoryName="Admin Uploads"
          />
        )}
      </div>

      {error && (
        <div className="text-red-600 bg-red-100 border border-red-400 rounded p-4 flex items-center space-x-2 mb-4">
          <AlertCircle className="h-5 w-5" />
          <span>Error: {error}</span>
        </div>
      )}

      <div className="relative min-h-[200px] max-h-[calc(100vh-250px)] overflow-auto rounded-md border">
        {(isLoading || isDeleting) && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2">
              {isDeleting ? "Deleting..." : "Loading..."}
            </span>
          </div>
        )}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length
              ? table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : !isLoading &&
                !isDeleting && (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No files found matching the criteria.
                    </TableCell>
                  </TableRow>
                )}
          </TableBody>
        </Table>
      </div>

      <AdminPagination
        pageIndex={currentPageIndex}
        pageSize={currentPageSize}
        totalCount={knownTotalCount}
        pageCount={paginationPageCount}
        totalLabel={
          hasMore
            ? `第 ${currentPageIndex + 1} 页，已加载至少 ${knownTotalCount} 条`
            : `第 ${currentPageIndex + 1} 页，共 ${knownTotalCount} 条`
        }
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        disabled={isLoading || isDeleting}
        onPageIndexChange={setCurrentPageIndex}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
