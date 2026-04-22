"use client";

import {
  createMyApiKey,
  deleteMyApiKey,
  getMyApiKeyValue,
  type UserApiKey,
  updateMyApiKeyStatus,
} from "@/actions/apikeys/user";
import {
  API_KEY_STATUS_ACTIVE,
  API_KEY_STATUS_DISABLED,
} from "@/lib/apikeys/index";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import dayjs from "dayjs";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

function formatDate(value: Date | string) {
  return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
}

export default function ApiKeysManager({
                                         initialApiKeys,
                                       }: {
  initialApiKeys: UserApiKey[];
}) {
  const t = useTranslations("ApiKeys");
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasRows = useMemo(() => initialApiKeys.length > 0, [initialApiKeys]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("toasts.copySuccess"));
    } catch {
      toast.error(t("toasts.copyError"));
    }
  };

  const handleCreate = () => {
    startTransition(async () => {
      const result = await createMyApiKey({ title: title || undefined });

      if (!result.success) {
        toast.error(t("toasts.createError"), {
          description: result.error,
        });
        return;
      }

      if (!result.data) {
        toast.error(t("toasts.createError"));
        return;
      }

      setTitle("");
      setNewApiKey(result.data.apiKey);
      setDialogOpen(true);
      toast.success(t("toasts.createSuccess"));
      router.refresh();
    });
  };

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const nextStatus =
        currentStatus === API_KEY_STATUS_ACTIVE
            ? API_KEY_STATUS_DISABLED
            : API_KEY_STATUS_ACTIVE;

    startTransition(async () => {
      const result = await updateMyApiKeyStatus({ id, status: nextStatus });
      if (!result.success) {
        toast.error(t("toasts.updateError"), {
          description: result.error,
        });
        return;
      }

      toast.success(t("toasts.updateSuccess"));
      router.refresh();
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      const result = await deleteMyApiKey({ id });
      if (!result.success) {
        toast.error(t("toasts.deleteError"), {
          description: result.error,
        });
        return;
      }

      toast.success(t("toasts.deleteSuccess"));
      router.refresh();
    });
  };

  const handleCopyApiKey = (id: number) => {
    startTransition(async () => {
      const result = await getMyApiKeyValue({ id });
      if (!result.success) {
        toast.error(t("toasts.copyError"), {
          description: result.error,
        });
        return;
      }

      if (!result.data) {
        toast.error(t("toasts.copyError"));
        return;
      }

      try {
        await navigator.clipboard.writeText(result.data.apiKey);
        toast.success(t("toasts.copySuccess"));
      } catch {
        setNewApiKey(result.data.apiKey);
        setDialogOpen(true);
        toast.error(t("toasts.copyError"));
      }
    });
  };

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("generate.title")}</CardTitle>
            <CardDescription>{t("generate.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("generate.placeholder")}
                  maxLength={100}
                  className="sm:max-w-md"
              />
              <Button onClick={handleCreate} disabled={isPending}>
                {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("generate.creating")}
                    </>
                ) : (
                    t("generate.button")
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("generate.hint")}</p>
          </CardContent>
        </Card>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.title")}</TableHead>
                <TableHead>{t("table.key")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.createdAt")}</TableHead>
                <TableHead className="text-right">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hasRows ? (
                  initialApiKeys.map((item) => {
                    const isActive = item.status === API_KEY_STATUS_ACTIVE;
                    return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.title || t("table.untitled")}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {item.apiKeyPreview}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isActive ? "secondary" : "outline"}>
                              {isActive ? t("status.active") : t("status.disabled")}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(item.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isPending}
                                  onClick={() => handleCopyApiKey(item.id)}
                              >
                                {t("actions.copy")}
                              </Button>
                              <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isPending}
                                  onClick={() =>
                                      handleToggleStatus(item.id, item.status)
                                  }
                              >
                                {isActive
                                    ? t("actions.disable")
                                    : t("actions.enable")}
                              </Button>
                              <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={isPending}
                                  onClick={() => handleDelete(item.id)}
                              >
                                {t("actions.delete")}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                    );
                  })
              ) : (
                  <TableRow>
                    <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                    >
                      {t("table.empty")}
                    </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("dialog.title")}</DialogTitle>
              <DialogDescription>{t("dialog.description")}</DialogDescription>
            </DialogHeader>
            <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs break-all">
              {newApiKey}
            </div>
            <DialogFooter>
              <Button
                  variant="outline"
                  onClick={() => {
                    if (newApiKey) {
                      handleCopy(newApiKey);
                    }
                  }}
              >
                {t("dialog.copy")}
              </Button>
              <Button onClick={() => setDialogOpen(false)}>
                {t("dialog.close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
