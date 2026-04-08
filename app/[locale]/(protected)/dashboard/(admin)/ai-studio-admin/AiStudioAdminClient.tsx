"use client";

import { markAiStudioGenerationFailedByAdmin } from "@/actions/ai-studio/admin";
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
import { Input } from "@/components/ui/input";
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
import { ChevronLeft, ChevronRight, LoaderCircle, Search } from "lucide-react";
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

function JsonDialog({
  title,
  value,
  triggerLabel,
}: {
  title: string;
  value: unknown;
  triggerLabel: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-sm text-primary hover:underline underline-offset-4"
        >
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <pre className="max-h-[70vh] overflow-auto rounded-md bg-muted p-4 text-xs leading-5">
          {JSON.stringify(value ?? {}, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}

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
  const [selectedRecord, setSelectedRecord] = useState<AdminData["records"][number] | null>(null);
  const [failureReason, setFailureReason] = useState("");
  const [isSubmittingFailure, startFailureTransition] = useTransition();

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

  function openFailDialog(record: AdminData["records"][number]) {
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

  return (
    <div className="space-y-6">
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
                  variant={category === value ? "secondary" : "outline"}
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
                  <TableHead>Status</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Provider Task</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Details</TableHead>
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
                        <div className="flex flex-col gap-2">
                          <StatusBadge status={record.status} />
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
                      <TableCell className="font-mono text-xs">
                        {record.providerTaskId || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(record.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!canAdminMarkGenerationFailed(record.status)}
                          onClick={() => openFailDialog(record)}
                        >
                          Mark failed
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <JsonDialog title="Request Payload" value={record.requestPayload} triggerLabel="Request" />
                          <JsonDialog title="Response Payload" value={record.responsePayload} triggerLabel="Response" />
                          <JsonDialog title="Callback Payload" value={record.callbackPayload} triggerLabel="Callback" />
                          <JsonDialog title="Pricing Snapshot" value={record.officialPricingSnapshot} triggerLabel="Pricing" />
                        </div>
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
