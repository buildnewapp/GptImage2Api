"use client";

import {
  markAiStudioGenerationFailedByAdmin,
  updateAiStudioGenerationByAdmin,
} from "@/actions/ai-studio/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canAdminMarkGenerationFailed } from "@/lib/ai-studio/admin";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

type AdminData = {
  records: Array<{
    id: string;
    userId: string;
    userEmail: string | null;
    userName: string | null;
    catalogModelId: string;
    category: string;
    title: string;
    provider: string;
    endpoint: string;
    method: string;
    providerTaskId: string | null;
    status: string;
    providerState: string | null;
    statusReason: string | null;
    requestPayload: unknown;
    responsePayload: unknown;
    callbackPayload: unknown;
    officialPricingSnapshot: unknown;
    resultUrls: string[];
    reservedCredits: number;
    capturedCredits: number;
  refundedCredits: number;
  createdAt: string;
  isPublic: boolean;
  userDeletedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  }>;
  total: number;
  totalPages: number;
  page: number;
  availableCategories: string[];
  summary: {
    total: number;
    active: number;
    succeeded: number;
    failed: number;
    reservedCredits: number;
    refundedCredits: number;
  };
};

function TextDialog({
  title,
  value,
  triggerLabel,
}: {
  title: string;
  value: string;
  triggerLabel: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-primary hover:underline underline-offset-4"
        >
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-md bg-muted p-4 text-sm leading-6 whitespace-pre-wrap break-words">
          {value}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        status === "succeeded" && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
        status === "failed" && "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400",
        (status === "queued" || status === "running" || status === "submitted" || status === "created") &&
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
      )}
    >
      {status}
    </Badge>
  );
}

type AdminRecord = AdminData["records"][number];

type EditFormState = {
  catalogModelId: string;
  category: string;
  resultUrlsText: string;
  isPublic: boolean;
  userDeletedAt: string;
  completedAt: string;
};

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function buildEditFormState(record: AdminRecord): EditFormState {
  return {
    catalogModelId: record.catalogModelId,
    category: record.category,
    resultUrlsText: record.resultUrls.join("\n"),
    isPublic: record.isPublic,
    userDeletedAt: toDateTimeLocalValue(record.userDeletedAt),
    completedAt: toDateTimeLocalValue(record.completedAt),
  };
}

export default function AiStudioAdminClient({
  initialData,
  initialUserId,
}: {
  initialData: AdminData;
  initialUserId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [selectedRecord, setSelectedRecord] = useState<AdminRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<AdminRecord | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    catalogModelId: "",
    category: "video",
    resultUrlsText: "",
    isPublic: true,
    userDeletedAt: "",
    completedAt: "",
  });
  const [selectedDetail, setSelectedDetail] = useState<{
    title: string;
    value: unknown;
  } | null>(null);
  const [failureReason, setFailureReason] = useState("");
  const [isSubmittingFailure, startFailureTransition] = useTransition();
  const [isSubmittingEdit, startEditTransition] = useTransition();

  const updateParams = useCallback(
    (params: Record<string, string | undefined>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value) sp.set(key, value);
        else sp.delete(key);
      });
      router.push(`${pathname}?${sp.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const status = searchParams.get("status") || "all";
  const category = searchParams.get("category") || "all";
  const categories = useMemo(
    () => ["all", ...initialData.availableCategories],
    [initialData.availableCategories],
  );

  function openFailDialog(record: AdminRecord) {
    setSelectedRecord(record);
    setFailureReason(record.statusReason || "Refunded after admin verification.");
  }

  function closeFailDialog(open: boolean) {
    if (open) {
      return;
    }
    setSelectedRecord(null);
    setFailureReason("");
  }

  function handleMarkFailed() {
    if (!selectedRecord) {
      return;
    }

    startFailureTransition(async () => {
      const result = await markAiStudioGenerationFailedByAdmin({
        generationId: selectedRecord.id,
        reason: failureReason,
      });

      if (!result.success) {
        toast.error("Failed to mark generation as failed", {
          description: result.error,
        });
        return;
      }

      toast.success("Generation marked as failed and refunded", {
        description: `${result.data?.refundedCredits ?? 0} credits refunded.`,
      });
      setSelectedRecord(null);
      setFailureReason("");
      router.refresh();
    });
  }

  function openDetailDialog(title: string, value: unknown) {
    setSelectedDetail({ title, value });
  }

  function closeDetailDialog(open: boolean) {
    if (open) {
      return;
    }

    setSelectedDetail(null);
  }

  function openEditDialog(record: AdminRecord) {
    setEditingRecord(record);
    setEditForm(buildEditFormState(record));
  }

  function closeEditDialog(open: boolean) {
    if (open) {
      return;
    }

    setEditingRecord(null);
  }

  function handleEditSave() {
    if (!editingRecord) {
      return;
    }

    startEditTransition(async () => {
      const result = await updateAiStudioGenerationByAdmin({
        generationId: editingRecord.id,
        catalogModelId: editForm.catalogModelId,
        category: editForm.category as "video" | "image" | "music" | "chat",
        resultUrlsText: editForm.resultUrlsText,
        isPublic: editForm.isPublic,
        userDeletedAt: editForm.userDeletedAt,
        completedAt: editForm.completedAt,
      });

      if (!result.success) {
        toast.error("Failed to update generation", {
          description: result.error,
        });
        return;
      }

      toast.success("Generation updated");
      setEditingRecord(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Dialog open={Boolean(editingRecord)} onOpenChange={closeEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit generation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium" htmlFor="edit-catalogModelId">
                  Catalog Model ID
                </label>
                <Input
                  id="edit-catalogModelId"
                  value={editForm.catalogModelId}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      catalogModelId: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="edit-category">
                  Category
                </label>
                <Select
                  value={editForm.category}
                  onValueChange={(value) =>
                    setEditForm((current) => ({
                      ...current,
                      category: value,
                    }))
                  }
                >
                  <SelectTrigger id="edit-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["video", "image", "music", "chat"].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">isPublic</div>
                  <div className="text-xs text-muted-foreground">
                    Control public visibility for this record.
                  </div>
                </div>
                <Switch
                  checked={editForm.isPublic}
                  onCheckedChange={(checked) =>
                    setEditForm((current) => ({
                      ...current,
                      isPublic: checked,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="edit-userDeletedAt">
                  userDeletedAt
                </label>
                <Input
                  id="edit-userDeletedAt"
                  type="datetime-local"
                  value={editForm.userDeletedAt}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      userDeletedAt: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="edit-completedAt">
                  completedAt
                </label>
                <Input
                  id="edit-completedAt"
                  type="datetime-local"
                  value={editForm.completedAt}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      completedAt: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium" htmlFor="edit-resultUrls">
                  resultUrls
                </label>
                <Textarea
                  id="edit-resultUrls"
                  rows={6}
                  value={editForm.resultUrlsText}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      resultUrlsText: event.target.value,
                    }))
                  }
                  placeholder="One URL per line"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => closeEditDialog(false)}
                disabled={isSubmittingEdit}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleEditSave} disabled={isSubmittingEdit}>
                {isSubmittingEdit ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedDetail)} onOpenChange={closeDetailDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedDetail?.title}</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[70vh] overflow-auto rounded-md bg-muted p-4 text-xs leading-5">
            {JSON.stringify(selectedDetail?.value ?? {}, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedRecord)} onOpenChange={closeFailDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Mark generation as failed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="font-medium">{selectedRecord?.title}</div>
              <div className="mt-1 text-muted-foreground">
                {selectedRecord?.id}
                {selectedRecord?.providerTaskId ? ` · ${selectedRecord.providerTaskId}` : ""}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="admin-failure-reason">
                Failure reason
              </label>
              <Textarea
                id="admin-failure-reason"
                value={failureReason}
                onChange={(event) => setFailureReason(event.target.value)}
                rows={4}
                placeholder="Explain why this generation should be marked failed and refunded."
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => closeFailDialog(false)}
                disabled={isSubmittingFailure}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleMarkFailed}
                disabled={isSubmittingFailure}
              >
                {isSubmittingFailure ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                Mark failed and refund
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-2xl font-semibold">AI Studio Admin</h1>
        <p className="text-muted-foreground">
          Inspect AI Studio generations, runtime payloads, and credit settlement state.
        </p>
      </div>

      {initialUserId ? (
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            当前按用户筛选: <span className="font-mono text-foreground">{initialUserId}</span>
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              updateParams({
                userId: undefined,
                page: undefined,
              })
            }
          >
            清除筛选
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle>{initialData.summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle>{initialData.summary.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Succeeded</CardDescription>
            <CardTitle>{initialData.summary.succeeded}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle>{initialData.summary.failed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Reserved</CardDescription>
            <CardTitle>{initialData.summary.reservedCredits}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Refunded</CardDescription>
            <CardTitle>{initialData.summary.refundedCredits}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generation Records</CardTitle>
          <CardDescription>
            Filter by status, category, user, title, provider, or generation id.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {["all", "created", "submitted", "queued", "running", "succeeded", "failed"].map((value) => (
              <Button
                key={value}
                type="button"
                variant={status === value ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  updateParams({
                    status: value === "all" ? undefined : value,
                    page: undefined,
                  })
                }
              >
                {value}
              </Button>
            ))}

            <div className="flex flex-wrap gap-2">
              {categories.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={category === value ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    updateParams({
                      category: value === "all" ? undefined : value,
                      page: undefined,
                    })
                  }
                >
                  {value}
                </Button>
              ))}
            </div>

            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
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
                placeholder="Search user, model, provider, generation id"
                className="w-[320px] pl-9"
              />
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Provider Task</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialData.records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      No AI Studio records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  initialData.records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{record.userName || "—"}</span>
                          <span className="text-xs text-muted-foreground">{record.userEmail || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{record.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {record.category} · {record.provider}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {record.catalogModelId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.resultUrls.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {record.resultUrls.map((url, index) => (
                              <a
                                key={`${record.id}-${index}`}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden rounded-md border bg-muted transition-opacity hover:opacity-80"
                              >
                                {record.category === "image" ? (
                                  <img
                                    src={url}
                                    alt={`${record.title} preview ${index + 1}`}
                                    className="h-8 w-12 object-cover"
                                  />
                                ) : (
                                  <video
                                    src={url}
                                    className="h-8 w-12 object-cover"
                                    muted
                                    playsInline
                                    preload="metadata"
                                  />
                                )}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <StatusBadge status={record.status} />
                          <button
                            type="button"
                            className="w-fit"
                            onClick={() => openEditDialog(record)}
                          >
                            <Badge variant={record.isPublic ? "default" : "outline"}>
                              {record.isPublic ? "Public" : "Private"}
                            </Badge>
                          </button>
                          {record.statusReason && (
                            <div className="max-w-[240px] rounded-md border border-rose-200/70 bg-rose-50/70 px-2.5 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
                              <div
                                className="overflow-hidden text-ellipsis whitespace-nowrap"
                                title={record.statusReason}
                              >
                                {record.statusReason}
                              </div>
                              <div className="mt-1">
                                <TextDialog
                                  title="Failure reason"
                                  value={record.statusReason}
                                  triggerLabel="View reason"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>Reserved {record.reservedCredits}</span>
                          <span className="text-muted-foreground">Refunded {record.refundedCredits}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 font-mono text-xs">
                          <span>{record.providerTaskId || "—"}</span>
                          <div className="flex items-center gap-2 font-sans">
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline underline-offset-4"
                              onClick={() =>
                                openDetailDialog("Request Payload", record.requestPayload)
                              }
                            >
                              Request
                            </button>
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline underline-offset-4"
                              onClick={() =>
                                openDetailDialog("Response Payload", record.responsePayload)
                              }
                            >
                              Response
                            </button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(record.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon">
                              <span className="sr-only">Open actions</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => openEditDialog(record)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={!canAdminMarkGenerationFailed(record.status)}
                              onSelect={() => openFailDialog(record)}
                            >
                              Mark failed and refund
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() =>
                                openDetailDialog("Request Payload", record.requestPayload)
                              }
                            >
                              Request
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                openDetailDialog("Response Payload", record.responsePayload)
                              }
                            >
                              Response
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                openDetailDialog("Callback Payload", record.callbackPayload)
                              }
                            >
                              Callback
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                openDetailDialog(
                                  "Pricing Snapshot",
                                  record.officialPricingSnapshot,
                                )
                              }
                            >
                              Pricing
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Page {initialData.page} of {initialData.totalPages} · {initialData.total} records
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={initialData.page <= 1}
                onClick={() =>
                  updateParams({
                    page: String(Math.max(1, initialData.page - 1)),
                  })
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={initialData.page >= initialData.totalPages}
                onClick={() =>
                  updateParams({
                    page: String(Math.min(initialData.totalPages, initialData.page + 1)),
                  })
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
