"use client";

import {
  previewAdminSystemEmail,
  sendOrResumeAdminSystemEmail,
  type PreviewResult,
  type SendResult,
} from "@/actions/system-emails/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type Scope = "all_users" | "all_paid_users" | "active_paid_users" | "single_user";

const DEFAULT_SCOPE: Scope = "all_users";

export function SystemEmailsForm() {
  const t = useTranslations("SystemEmails");
  const [scope, setScope] = useState<Scope>(DEFAULT_SCOPE);
  const [singleUserQuery, setSingleUserQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [progress, setProgress] = useState<SendResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeProgress = preview && progress?.jobId === preview.jobId ? progress : null;
  const isCompleted = activeProgress?.status === "completed";
  const canSend = !!preview && !isCompleted;

  function resetJobState() {
    setPreview(null);
    setProgress(null);
    setErrorMessage(null);
  }

  function handleScopeChange(nextScope: string) {
    resetJobState();
    setScope(nextScope as Scope);
  }

  async function handlePreview() {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await previewAdminSystemEmail({
        scope,
        singleUserQuery,
        subject,
        body,
      });

      if (!result.success || !result.data) {
        const message = result.success ? t("errors.previewFailed") : result.error;
        setErrorMessage(message);
        toast.error(t("toasts.previewError"), {
          description: message,
        });
        return;
      }

      setPreview(result.data);
      setProgress(null);
      toast.success(t("toasts.previewReady"), {
        description: t("toasts.previewReadyDescription", {
          count: result.data.totalRecipients,
        }),
      });
    });
  }

  async function handleSend() {
    if (!preview) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await sendOrResumeAdminSystemEmail({
        jobId: preview.jobId,
      });

      if (!result.success || !result.data) {
        const message = result.success ? t("errors.sendFailed") : result.error;
        setErrorMessage(message);
        toast.error(t("toasts.sendError"), {
          description: message,
        });
        return;
      }

      setProgress(result.data);

      if (result.data.status === "completed") {
        toast.success(t("toasts.sendCompleted"), {
          description: t("toasts.sendCompletedDescription", {
            successCount: result.data.successCount,
            failureCount: result.data.failureCount,
          }),
        });
        return;
      }

      toast.success(t("toasts.sendProgress"), {
        description: t("toasts.sendProgressDescription", {
          processedCount: result.data.processedCount,
          totalRecipients: result.data.totalRecipients,
        }),
      });
    });
  }

  const sendButtonLabel = isCompleted
    ? t("actions.completed")
    : activeProgress && activeProgress.processedCount > 0
      ? t("actions.continueSend")
      : t("actions.send");

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground max-w-3xl">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("form.title")}</CardTitle>
          <CardDescription>{t("form.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scope">{t("fields.scope")}</Label>
              <Select value={scope} onValueChange={handleScopeChange}>
                <SelectTrigger id="scope" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_users">{t("scopes.all_users")}</SelectItem>
                  <SelectItem value="all_paid_users">
                    {t("scopes.all_paid_users")}
                  </SelectItem>
                  <SelectItem value="active_paid_users">
                    {t("scopes.active_paid_users")}
                  </SelectItem>
                  <SelectItem value="single_user">
                    {t("scopes.single_user")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scope === "single_user" ? (
              <div className="space-y-2">
                <Label htmlFor="single-user">{t("fields.singleUserQuery")}</Label>
                <Input
                  id="single-user"
                  value={singleUserQuery}
                  onChange={(event) => {
                    resetJobState();
                    setSingleUserQuery(event.target.value);
                  }}
                  placeholder={t("placeholders.singleUserQuery")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("help.singleUser")}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                {t("help.scope")}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">{t("fields.subject")}</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(event) => {
                resetJobState();
                setSubject(event.target.value);
              }}
              placeholder={t("placeholders.subject")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">{t("fields.body")}</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(event) => {
                resetJobState();
                setBody(event.target.value);
              }}
              placeholder={t("placeholders.body")}
              className="min-h-48"
            />
            <p className="text-xs text-muted-foreground">{t("help.body")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handlePreview} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("actions.preview")}
            </Button>
            <Button
              variant="outline"
              onClick={handleSend}
              disabled={isPending || !canSend}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {sendButtonLabel}
            </Button>
            <span className="text-sm text-muted-foreground">{t("help.batch")}</span>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>{t("preview.title")}</CardTitle>
              <Badge variant="secondary">{t(`scopes.${preview.scope}`)}</Badge>
              {activeProgress ? (
                <Badge variant={isCompleted ? "outline" : "secondary"}>
                  {t(`status.${activeProgress.status}`)}
                </Badge>
              ) : null}
            </div>
            <CardDescription>{t("preview.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">
                  {t("preview.totalRecipients")}
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {preview.totalRecipients}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4 md:col-span-2">
                <p className="text-sm text-muted-foreground">
                  {t("preview.sampleRecipients")}
                </p>
                <p className="mt-1 break-all font-mono text-sm">
                  {preview.sampleRecipients.join(", ")}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">{t("preview.jobId")}</p>
              <p className="mt-1 font-mono text-xs">{preview.jobId}</p>
            </div>

            {activeProgress ? (
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("progress.processed")}
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {activeProgress.processedCount}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("progress.success")}
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {activeProgress.successCount}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("progress.failure")}
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {activeProgress.failureCount}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("progress.remaining")}
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {activeProgress.remainingCount}
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default SystemEmailsForm;
