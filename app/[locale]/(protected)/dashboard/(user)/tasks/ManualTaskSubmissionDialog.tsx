"use client";

import { submitManualTaskApplicationAction } from "@/actions/task-rewards/applications";
import { createTaskEvidenceUploadAction } from "@/actions/task-rewards/evidence";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ManualReviewTaskKey } from "@/config/task-rewards";
import { ExternalLink, ImagePlus, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

const MAX_TASK_EVIDENCE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface ManualTaskSubmissionDialogProps {
  taskKey: ManualReviewTaskKey;
  targetUrl: string;
  title: string;
  description: string;
  triggerLabel: string;
}

export default function ManualTaskSubmissionDialog({
  taskKey,
  targetUrl,
  title,
  description,
  triggerLabel,
}: ManualTaskSubmissionDialogProps) {
  const t = useTranslations("DashboardUserTasks");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const releasePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  };

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const resetForm = () => {
    releasePreview();
    setFile(null);
    setSubmissionText("");
    setFileError(null);
    setTextError(null);
    setFormError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting && !nextOpen) return;
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  };

  const validateFile = (nextFile: File | null): nextFile is File => {
    if (!nextFile) {
      setFileError(t("manualSubmission.validation.screenshotRequired"));
      return false;
    }
    if (!ALLOWED_IMAGE_TYPES.has(nextFile.type)) {
      setFileError(t("manualSubmission.validation.screenshotType"));
      return false;
    }
    if (nextFile.size > MAX_TASK_EVIDENCE_BYTES) {
      setFileError(t("manualSubmission.validation.screenshotSize"));
      return false;
    }
    setFileError(null);
    return true;
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const nextFile = files?.length === 1 ? files[0] : null;
    releasePreview();
    setFile(null);
    setFormError(null);

    if (!validateFile(nextFile)) {
      event.target.value = "";
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(nextFile);
    previewUrlRef.current = nextPreviewUrl;
    setFile(nextFile);
    setPreviewUrl(nextPreviewUrl);
  };

  const validateText = (): string | null => {
    const trimmedText = submissionText.trim();
    if (!trimmedText) {
      setTextError(t("manualSubmission.validation.textRequired"));
      return null;
    }
    if (trimmedText.length > 500) {
      setTextError(t("manualSubmission.validation.textLength"));
      return null;
    }
    setTextError(null);
    return trimmedText;
  };

  const getSubmissionError = (customCode?: string) => {
    switch (customCode) {
      case "task_disabled":
        return t("manualSubmission.errors.taskDisabled");
      case "already_claimed":
        return t("manualSubmission.errors.alreadyClaimed");
      case "pending_application_exists":
        return t("manualSubmission.errors.pending");
      case "invalid_evidence":
      case "invalid_evidence_file":
        return t("manualSubmission.errors.invalidEvidence");
      case "validation":
        return t("manualSubmission.errors.validation");
      default:
        return t("manualSubmission.errors.submit");
    }
  };

  const getUploadError = (customCode?: string) => {
    if (customCode === "task_disabled") {
      return t("manualSubmission.errors.taskDisabled");
    }
    if (customCode === "invalid_evidence_file") {
      return t("manualSubmission.errors.invalidEvidence");
    }
    return t("manualSubmission.errors.upload");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const hasValidFile = validateFile(file);
    const trimmedText = validateText();
    if (!hasValidFile) {
      fileInputRef.current?.focus();
      return;
    }
    if (!trimmedText) {
      textInputRef.current?.focus();
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      let upload;
      try {
        upload = await createTaskEvidenceUploadAction({
          taskKey,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
        });
      } catch {
        setFormError(t("manualSubmission.errors.upload"));
        return;
      }

      if (!upload.success || !upload.data) {
        setFormError(
          upload.success
            ? t("manualSubmission.errors.upload")
            : getUploadError(upload.customCode),
        );
        return;
      }

      try {
        const uploadResponse = await fetch(upload.data.presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadResponse.ok) {
          setFormError(t("manualSubmission.errors.upload"));
          return;
        }
      } catch {
        setFormError(t("manualSubmission.errors.upload"));
        return;
      }

      let submission;
      try {
        submission = await submitManualTaskApplicationAction({
          taskKey,
          evidenceKey: upload.data.key,
          submissionText: trimmedText,
        });
      } catch {
        setFormError(t("manualSubmission.errors.submit"));
        return;
      }

      if (!submission.success) {
        setFormError(getSubmissionError(submission.customCode));
        return;
      }

      toast.success(t("manualSubmission.success"));
      resetForm();
      setOpen(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const screenshotErrorId = `${taskKey}-screenshot-error`;
  const screenshotHintId = `${taskKey}-screenshot-hint`;
  const textErrorId = `${taskKey}-text-error`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-9 min-w-[104px] whitespace-nowrap px-3">
          <ImagePlus className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description} {t("manualSubmission.description")}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <Button
            asChild
            type="button"
            variant="outline"
            className="w-full whitespace-nowrap"
          >
            <a href={targetUrl} target="_blank" rel="noopener noreferrer">
              {t("manualSubmission.openTarget")}
              <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
            </a>
          </Button>

          <div className="space-y-2">
            <Label htmlFor={`${taskKey}-screenshot`}>
              {t("manualSubmission.screenshotLabel")}
            </Label>
            <Input
              ref={fileInputRef}
              id={`${taskKey}-screenshot`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={isSubmitting}
              aria-invalid={Boolean(fileError)}
              aria-describedby={
                fileError
                  ? `${screenshotHintId} ${screenshotErrorId}`
                  : screenshotHintId
              }
              onChange={handleFileChange}
            />
            <p
              id={screenshotHintId}
              className="text-xs leading-5 text-muted-foreground"
            >
              {t("manualSubmission.screenshotHint")}
            </p>
            {fileError ? (
              <p
                id={screenshotErrorId}
                role="alert"
                className="text-xs text-destructive"
              >
                {fileError}
              </p>
            ) : null}
            {previewUrl ? (
              <div className="overflow-hidden rounded-lg border bg-muted/30 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={t("manualSubmission.screenshotAlt", { title })}
                  className="max-h-56 w-full rounded-md object-contain"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor={`${taskKey}-submission-text`}>
                {t("manualSubmission.textLabel")}
              </Label>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t("manualSubmission.characterCount", {
                  current: submissionText.length,
                  maximum: 500,
                })}
              </span>
            </div>
            <Textarea
              ref={textInputRef}
              id={`${taskKey}-submission-text`}
              value={submissionText}
              maxLength={500}
              rows={5}
              disabled={isSubmitting}
              aria-invalid={Boolean(textError)}
              aria-describedby={textError ? textErrorId : undefined}
              placeholder={t("manualSubmission.textPlaceholder")}
              onChange={(event) => {
                setSubmissionText(event.target.value);
                setTextError(null);
                setFormError(null);
              }}
            />
            {textError ? (
              <p
                id={textErrorId}
                role="alert"
                className="text-xs text-destructive"
              >
                {textError}
              </p>
            ) : null}
          </div>

          {formError ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="whitespace-nowrap"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              {t("manualSubmission.cancel")}
            </Button>
            <Button
              type="submit"
              className="whitespace-nowrap"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="mr-2 h-4 w-4" />
              )}
              {isSubmitting
                ? t("manualSubmission.submitting")
                : t("manualSubmission.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
