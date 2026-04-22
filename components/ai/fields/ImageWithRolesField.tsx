"use client";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/error-utils";
import {
  getImageWithRolesSlotUrl,
  setImageWithRolesSlotUrl,
  type ImageWithRolesSlot,
} from "@/lib/ai-video-studio/image-with-roles";
import { uploadReferenceFile } from "@/lib/ai-video-studio/reference-upload";
import {
  getDefaultReferenceFieldTexts,
  getReferenceDisplayName,
  getReferenceUploadConfig,
  ReferenceUploadShell,
  validateReferenceUrl,
} from "@/components/ai/fields/ReferenceField";
import { ImageIcon, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type ImageWithRolesFieldProps = {
  inputId: string;
  label: string;
  value: unknown;
  disabled?: boolean;
  onChange: (value: unknown) => void;
};

function ImageWithRoleSlot({
  slot,
  title,
  inputId,
  currentUrl,
  disabled,
  onChange,
}: {
  slot: ImageWithRolesSlot;
  title: string;
  inputId: string;
  currentUrl: string;
  disabled?: boolean;
  onChange: (url: string) => void;
}) {
  const texts = useMemo(() => getDefaultReferenceFieldTexts(), []);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [isUploading, setIsUploading] = useState(false);
  const hasImage = currentUrl.trim().length > 0;
  const uploadConfig = getReferenceUploadConfig("image");

  const handleUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error(texts.imageOnlyError);
      return;
    }

    if (file.size > uploadConfig.maxSize) {
      toast.error(texts.uploadTooLarge(uploadConfig.maxSize / 1024 / 1024));
      return;
    }

    try {
      setIsUploading(true);
      const uploadedUrl = await uploadReferenceFile({
        kind: "image",
        file,
      });
      onChange(uploadedUrl);
    } catch (error) {
      toast.error(getErrorMessage(error) || texts.uploadFailed);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleSaveUrl = () => {
    const trimmed = urlInput.trim();

    if (!validateReferenceUrl(trimmed)) {
      toast.error(texts.invalidUrl);
      return;
    }

    onChange(trimmed);
  };

  return (
    <section
      data-ai-video-studio-image-with-role-slot={slot}
      className="space-y-3"
    >
      <ReferenceUploadShell
        kind="image"
        inputId={`${inputId}-${slot}`}
        label={(
          <div className="inline-flex items-center gap-2 font-medium text-muted-foreground text-sm">
            <span className="size-4 text-muted-foreground">
              <ImageIcon className="size-4" />
            </span>
            <span>{title}</span>
          </div>
        )}
        disabled={disabled}
        supportsUpload
        showUploadArea={!hasImage}
        isUrlMode={isUrlMode}
        onUrlModeChange={setIsUrlMode}
        isUploading={isUploading}
        isUploadDisabled={Boolean(disabled || isUploading)}
        uploadTitle={texts.uploadTitle}
        uploadingText={texts.uploading}
        formatsLabel={texts.imageFormats}
        useUrlLabel={texts.useUrlLabel}
        urlPlaceholder={texts.imageUrlPlaceholder}
        urlValue={urlInput}
        onUrlValueChange={setUrlInput}
        onSubmitUrl={handleSaveUrl}
        submitButtonLabel={hasImage ? "Update" : texts.addButton}
        isSubmitDisabled={Boolean(disabled || !urlInput.trim())}
        inputRef={inputRef}
        accept={uploadConfig.accept}
        multiple={false}
        onFileChange={(event) => void handleUpload(event.target.files)}
      >
        {hasImage ? (
          <div className="relative h-[100px] overflow-hidden rounded-xl border border-border/60 bg-background/50">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => onChange("")}
              disabled={disabled}
              className="absolute right-2 top-2 z-10 size-7 rounded-full bg-background/90 shadow-sm"
            >
              <Trash2 className="size-4" />
            </Button>
            <img
              src={currentUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
              <div className="truncate text-xs font-medium text-white">
                {getReferenceDisplayName(currentUrl)}
              </div>
            </div>
          </div>
        ) : null}
      </ReferenceUploadShell>
    </section>
  );
}

export default function ImageWithRolesField({
  inputId,
  label,
  value,
  disabled,
  onChange,
}: ImageWithRolesFieldProps) {
  const slots = useMemo(
    () => [
      {
        role: "first_frame" as const,
        title: "First Frame",
      },
      {
        role: "last_frame" as const,
        title: "End Frame",
      },
    ],
    [],
  );

  return (
    <div
      data-ai-video-studio-image-with-roles
      className="space-y-6"
    >
      <span className="sr-only">{label}</span>
      {slots.map((slot) => (
        <ImageWithRoleSlot
          key={slot.role}
          slot={slot.role}
          title={slot.title}
          inputId={inputId}
          currentUrl={getImageWithRolesSlotUrl(value, slot.role)}
          disabled={disabled}
          onChange={(nextUrl) =>
            onChange(setImageWithRolesSlotUrl(value, slot.role, nextUrl))
          }
        />
      ))}
    </div>
  );
}
