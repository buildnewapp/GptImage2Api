"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type PromptRow = {
  id: string;
  thumbnailUrl: string;
  imageUrl: string;
};

interface TestPromptsTableProps {
  rows: PromptRow[];
}

type CopyState = {
  type: "success" | "error";
  message: string;
} | null;

export default function TestPromptsTable({ rows }: TestPromptsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copyState, setCopyState] = useState<CopyState>(null);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedSet.has(row.id)),
    [rows, selectedSet],
  );

  const displayedRows = useMemo(() => {
    if (showSelectedOnly) {
      return selectedRows;
    }

    return rows;
  }, [rows, selectedRows, showSelectedOnly]);

  const handleCheckedChange = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) {
        if (current.includes(id)) {
          return current;
        }
        return [...current, id];
      }

      return current.filter((item) => item !== id);
    });
  };

  const handleCopy = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState({ type: "success", message: successMessage });
    } catch {
      setCopyState({ type: "error", message: "复制失败，请检查浏览器权限" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-20 z-10 flex flex-wrap items-center gap-3 bg-background py-2">
        <Button
          type="button"
          onClick={() =>
            handleCopy(
              JSON.stringify(selectedRows.map((row) => row.id)),
              "已复制所选 id 列表",
            )
          }
          disabled={selectedRows.length === 0}
        >
          复制 id 列表
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            handleCopy(
              JSON.stringify(selectedRows.map((row) => row.thumbnailUrl)),
              "已复制所选缩略图 URL 列表",
            )
          }
          disabled={selectedRows.length === 0}
        >
          复制缩略图 array string
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowSelectedOnly((current) => !current)}
        >
          {showSelectedOnly ? "显示全部" : "只显示已选"}
        </Button>
        <div className="text-sm text-muted-foreground">
          共 {rows.length} 条，当前显示 {displayedRows.length} 条，已选{" "}
          {selectedRows.length} 条
        </div>
      </div>

      {copyState ? (
        <div
          className={
            copyState.type === "success"
              ? "text-sm text-emerald-600"
              : "text-sm text-red-600"
          }
        >
          {copyState.message}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-3 font-medium">check</th>
              <th className="px-3 py-3 font-medium">id</th>
              <th className="px-3 py-3 font-medium">缩略图</th>
              <th className="px-3 py-3 font-medium">缩略图url</th>
              <th className="px-3 py-3 font-medium">高清图url</th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row) => {
              const isSelected = selectedSet.has(row.id);
              const previewUrl = row.imageUrl || row.thumbnailUrl;

              return (
                <tr key={row.id} className="border-t align-top">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(event) =>
                        handleCheckedChange(row.id, event.target.checked)
                      }
                    />
                  </td>
                  <td className="px-3 py-3 font-mono">
                    <button
                      type="button"
                      className="cursor-pointer text-left"
                      onClick={() => handleCheckedChange(row.id, !isSelected)}
                    >
                      {row.id}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="cursor-pointer"
                      onClick={() => handleCheckedChange(row.id, !isSelected)}
                    >
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={row.id}
                          className="h-auto max-h-20 w-auto rounded border object-contain"
                        />
                      ) : null}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <a
                      href={row.thumbnailUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-blue-600 hover:underline"
                    >
                      {row.thumbnailUrl}
                    </a>
                  </td>
                  <td className="px-3 py-3">
                    <a
                      href={row.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-blue-600 hover:underline"
                    >
                      {row.imageUrl}
                    </a>
                  </td>
                </tr>
              );
            })}
            {displayedRows.length === 0 ? (
              <tr className="border-t">
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  暂无数据
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
