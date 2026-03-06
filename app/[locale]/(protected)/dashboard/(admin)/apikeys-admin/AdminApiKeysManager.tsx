"use client";

import {
  getAdminApiKeyValue,
  deleteAdminApiKey,
  type AdminApiKey,
  updateAdminApiKeyStatus,
} from "@/actions/apikeys/admin";
import {
  API_KEY_STATUS_ACTIVE,
  API_KEY_STATUS_DISABLED,
} from "@/lib/apikeys/index";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function AdminApiKeysManager({
                                              initialApiKeys,
                                            }: {
  initialApiKeys: AdminApiKey[];
}) {
  const t = useTranslations("AdminApiKeys");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const rows = useMemo(() => {
    if (!query.trim()) {
      return initialApiKeys;
    }

    const keyword = query.trim().toLowerCase();

    return initialApiKeys.filter((item) => {
      const targets = [
        item.title,
        item.userEmail,
        item.userUuid,
        item.apiKeyPreview,
        item.status,
      ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

      return targets.includes(keyword);
    });
  }, [initialApiKeys, query]);

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const nextStatus =
        currentStatus === API_KEY_STATUS_ACTIVE
            ? API_KEY_STATUS_DISABLED
            : API_KEY_STATUS_ACTIVE;

    startTransition(async () => {
      const result = await updateAdminApiKeyStatus({ id, status: nextStatus });

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
      const result = await deleteAdminApiKey({ id });

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
      const result = await getAdminApiKeyValue({ id });

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
        toast.error(t("toasts.copyError"));
      }
    });
  };

  return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Input
              placeholder={t("searchPlaceholder")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="max-w-sm"
          />
          {isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.user")}</TableHead>
                <TableHead>{t("table.title")}</TableHead>
                <TableHead>{t("table.key")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.createdAt")}</TableHead>
                <TableHead className="text-right">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                  rows.map((item) => {
                    const isActive = item.status === API_KEY_STATUS_ACTIVE;

                    return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex flex-col">
                        <span className="font-medium">
                          {item.userEmail || "-"}
                        </span>
                              <span className="text-xs text-muted-foreground font-mono">
                          {item.userUuid}
                        </span>
                            </div>
                          </TableCell>
                          <TableCell>{item.title || t("table.untitled")}</TableCell>
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
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                    >
                      {t("table.empty")}
                    </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
  );
}
