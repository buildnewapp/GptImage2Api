"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/error-utils";
import { uploadReferenceFile } from "@/lib/ai-video-studio/reference-upload";
import { cn } from "@/lib/utils";
import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";
import {
  AudioLines,
  Link2,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import type {
  ChangeEvent,
  ReactNode,
  RefObject,
} from "react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export type ReferenceFieldKind = "image" | "video" | "audio" | "url";

export type ReferenceFieldTexts = {
  showCountLabel?: boolean;
  useUrlLabel?: string;
  uploadTitle?: string;
  addButton?: string;
  removeButton?: string;
  imageFormats?: string;
  videoFormats?: string;
  audioFormats?: string;
  imageDescription?: (max: number) => string;
  videoDescription?: (max: number) => string;
  audioDescription?: (max: number) => string;
  urlDescription?: (max: number) => string;
  countLabel?: (current: number, max: number) => string;
  invalidUrl?: string;
  uploadFailed?: string;
  uploading?: string;
  imageOnlyError?: string;
  videoOnlyError?: string;
  videoDurationRequiredError?: string;
  audioDurationRequiredError?: string;
  audioOnlyError?: string;
  uploadTooLarge?: (sizeInMb: number) => string;
  imageUrlPlaceholder?: string;
  videoUrlPlaceholder?: string;
  audioUrlPlaceholder?: string;
  genericUrlPlaceholder?: string;
};

type ReferenceFieldProps = {
  field: AiVideoStudioFieldDescriptor;
  inputId: string;
  label: string;
  value: unknown;
  disabled?: boolean;
  labelIcon?: ReactNode;
  labelTitle?: string;
  texts?: ReferenceFieldTexts;
  onMetadataChange?: (
    metadata: {
      videoDurationsByUrl?: Record<string, number>;
      audioDurationsByUrl?: Record<string, number>;
    },
  ) => void;
  onChange: (value: unknown) => void;
};

type ReferenceUploadShellProps = {
  kind: ReferenceFieldKind;
  inputId: string;
  label: ReactNode;
  disabled?: boolean;
  supportsUpload?: boolean;
  showUploadArea?: boolean;
  isUrlMode: boolean;
  onUrlModeChange: (next: boolean) => void;
  isUploading: boolean;
  isUploadDisabled: boolean;
  uploadTitle: string;
  uploadingText: string;
  formatsLabel?: string;
  useUrlLabel: string;
  urlPlaceholder: string;
  urlValue: string;
  onUrlValueChange: (next: string) => void;
  isUrlInputDisabled?: boolean;
  onSubmitUrl: () => void;
  submitButtonLabel: string;
  isSubmitDisabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  accept?: string;
  multiple?: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  children?: ReactNode;
};

const IMAGE_MAX_SIZE = 10 * 1024 * 1024;
const VIDEO_MAX_SIZE = 100 * 1024 * 1024;
const AUDIO_MAX_SIZE = 20 * 1024 * 1024;
const IMAGE_UPLOAD_PATH = "ai-video-studio/reference-images";
const VIDEO_UPLOAD_PATH = "ai-video-studio/reference-videos";
const AUDIO_UPLOAD_PATH = "ai-video-studio/reference-audios";

function getFieldTokens(path: string[]) {
  return path
    .flatMap((segment) =>
      segment
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter(Boolean),
    );
}

const PLURAL_REFERENCE_TOKENS = new Set(["images", "videos", "audios", "urls"]);
const SINGLE_REFERENCE_TOKENS = new Set(["image", "video", "audio", "url"]);

function supportsReferenceField(field: AiVideoStudioFieldDescriptor) {
  if (field.kind === "text") {
    return field.schema.type === "string";
  }

  if (field.kind === "array") {
    return field.schema.type === "array" && field.schema.items?.type === "string";
  }

  return false;
}

export function resolveReferenceFieldKind(
  field: AiVideoStudioFieldDescriptor,
): ReferenceFieldKind | null {
  if (!supportsReferenceField(field)) {
    return null;
  }

  const tokens = getFieldTokens(field.path);
  const description =
    typeof field.schema.description === "string"
      ? field.schema.description.toLowerCase()
      : "";

  if (tokens.includes("image") || tokens.includes("images")) {
    return "image";
  }

  if (tokens.includes("video") || tokens.includes("videos")) {
    return "video";
  }

  if (tokens.includes("audio") || tokens.includes("audios")) {
    return "audio";
  }

  if (tokens.includes("url") || tokens.includes("urls")) {
    if (description.includes("image")) {
      return "image";
    }

    if (description.includes("video")) {
      return "video";
    }

    if (description.includes("audio")) {
      return "audio";
    }

    return "url";
  }

  return null;
}

function getReferenceFieldCapacity(field: AiVideoStudioFieldDescriptor) {
  const tokens = getFieldTokens(field.path);

  if (tokens.some((token) => PLURAL_REFERENCE_TOKENS.has(token))) {
    return {
      isMultiple: true,
      maxItems: 9,
    };
  }

  if (tokens.some((token) => SINGLE_REFERENCE_TOKENS.has(token))) {
    return {
      isMultiple: false,
      maxItems: 1,
    };
  }

  if (field.kind === "array") {
    const schemaMaxItems =
      typeof field.schema.maxItems === "number" ? field.schema.maxItems : 9;

    return {
      isMultiple: schemaMaxItems > 1,
      maxItems: Math.min(schemaMaxItems, 9),
    };
  }

  return {
    isMultiple: false,
    maxItems: 1,
  };
}

function getUrls(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
  }

  return typeof value === "string" && value.trim().length > 0 ? [value] : [];
}

function toFieldValue(
  field: AiVideoStudioFieldDescriptor,
  urls: string[],
) {
  if (field.kind === "array") {
    return urls;
  }

  return urls[0] ?? "";
}

export function getDefaultReferenceFieldTexts(): Required<ReferenceFieldTexts> {
  return {
    showCountLabel: false,
    useUrlLabel: "Use URL",
    uploadTitle: "Click to upload",
    addButton: "Add",
    removeButton: "Remove",
    imageFormats: "image/*.png,.jpg,.jpeg,.webp",
    videoFormats: "video/*.mp4,.mov,.webm,.mkv",
    audioFormats: "audio/*.mp3,.wav,.m4a,.aac,.ogg",
    imageDescription: (max) => `Upload reference images, up to ${max}.`,
    videoDescription: (max) => `Upload reference videos, up to ${max}.`,
    audioDescription: (max) => `Upload reference audios, up to ${max}.`,
    urlDescription: (max) => `Add public URLs, up to ${max}.`,
    countLabel: (current, max) => `${current}/${max}`,
    invalidUrl: "Please enter a valid URL.",
    uploadFailed: "Upload failed.",
    uploading: "Uploading...",
    imageOnlyError: "Only image files are allowed.",
    videoOnlyError: "Only video files are allowed.",
    videoDurationRequiredError:
      "We couldn't read the video duration. Upload the video file or use a direct video URL that exposes metadata.",
    audioDurationRequiredError:
      "We couldn't read the audio duration. Upload the audio file or use a direct audio URL that exposes metadata.",
    audioOnlyError: "Only audio files are allowed.",
    uploadTooLarge: (sizeInMb) => `File size cannot exceed ${sizeInMb}MB.`,
    imageUrlPlaceholder: "https://example.com/reference-image.png",
    videoUrlPlaceholder: "https://example.com/reference-video.mp4",
    audioUrlPlaceholder: "https://example.com/reference-audio.mp3",
    genericUrlPlaceholder: "https://example.com/resource",
  };
}

function getFormatsLabel(
  kind: ReferenceFieldKind,
  texts: Required<ReferenceFieldTexts>,
) {
  if (kind === "image") {
    return texts.imageFormats;
  }

  if (kind === "video") {
    return texts.videoFormats;
  }

  if (kind === "audio") {
    return texts.audioFormats;
  }

  return "";
}

function getUrlPlaceholder(
  kind: ReferenceFieldKind,
  texts: Required<ReferenceFieldTexts>,
) {
  if (kind === "image") {
    return texts.imageUrlPlaceholder;
  }

  if (kind === "video") {
    return texts.videoUrlPlaceholder;
  }

  if (kind === "audio") {
    return texts.audioUrlPlaceholder;
  }

  return texts.genericUrlPlaceholder;
}

export function getReferenceUploadConfig(
  kind: Exclude<ReferenceFieldKind, "url">,
) {
  if (kind === "image") {
    return {
      accept: "image/png,image/jpeg,image/webp",
      path: IMAGE_UPLOAD_PATH,
      prefix: "reference-image",
      maxSize: IMAGE_MAX_SIZE,
    };
  }

  if (kind === "audio") {
    return {
      accept: "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg",
      path: AUDIO_UPLOAD_PATH,
      prefix: "reference-audio",
      maxSize: AUDIO_MAX_SIZE,
    };
  }

  return {
    accept: "video/mp4,video/quicktime,video/webm,video/x-matroska",
    path: VIDEO_UPLOAD_PATH,
    prefix: "reference-video",
    maxSize: VIDEO_MAX_SIZE,
  };
}

export function validateReferenceUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getReferenceDisplayName(value: string) {
  try {
    const parsed = new URL(value);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();

    return lastSegment || parsed.hostname;
  } catch {
    return value;
  }
}

async function getVideoDurationFromUrl(url: string) {
  return new Promise<number | null>((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) && video.duration > 0
        ? Math.ceil(video.duration)
        : null;
      cleanup();
      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    video.src = url;
  });
}

async function getAudioDurationFromUrl(url: string) {
  return new Promise<number | null>((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    const cleanup = () => {
      audio.removeAttribute("src");
      audio.load();
    };

    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) && audio.duration > 0
        ? Math.ceil(audio.duration)
        : null;
      cleanup();
      resolve(duration);
    };

    audio.onerror = () => {
      cleanup();
      resolve(null);
    };

    audio.src = url;
  });
}

export async function prepareVideoReferenceUrl(input: {
  url: string;
  readDuration?: (url: string) => Promise<number | null>;
}) {
  const readDuration = input.readDuration ?? getVideoDurationFromUrl;
  const duration = await readDuration(input.url);

  if (duration === null || duration <= 0) {
    return null;
  }

  return {
    url: input.url,
    duration: Math.ceil(duration),
  };
}

export async function prepareAudioReferenceUrl(input: {
  url: string;
  readDuration?: (url: string) => Promise<number | null>;
}) {
  const readDuration = input.readDuration ?? getAudioDurationFromUrl;
  const duration = await readDuration(input.url);

  if (duration === null || duration <= 0) {
    return null;
  }

  return {
    url: input.url,
    duration: Math.ceil(duration),
  };
}

async function getVideoDurationFromFile(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    return await getVideoDurationFromUrl(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function getAudioDurationFromFile(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    return await getAudioDurationFromUrl(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function renderReferencePreview(
  kind: ReferenceFieldKind,
  value: string,
) {
  if (kind === "image") {
    return (
      <img
        src={value}
        alt=""
        className="h-full w-full object-cover"
      />
    );
  }

  if (kind === "video") {
    return (
      <video
        src={value}
        className="h-full w-full bg-black object-cover"
        controls
        preload="metadata"
      />
    );
  }

  if (kind === "audio") {
    return (
      <div
        data-ai-video-studio-audio-preview
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-primary/5 p-3 text-center"
      >
        <div className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <AudioLines className="size-5" />
        </div>
        <div className="line-clamp-2 text-xs font-medium text-foreground">
          {getReferenceDisplayName(value)}
        </div>
        <audio
          src={value}
          controls
          preload="metadata"
          className="w-full max-w-full"
        />
      </div>
    );
  }

  return null;
}

export function ReferenceUploadShell({
  kind,
  inputId,
  label,
  disabled,
  supportsUpload = true,
  showUploadArea = true,
  isUrlMode,
  onUrlModeChange,
  isUploading,
  isUploadDisabled,
  uploadTitle,
  uploadingText,
  formatsLabel,
  useUrlLabel,
  urlPlaceholder,
  urlValue,
  onUrlValueChange,
  isUrlInputDisabled,
  onSubmitUrl,
  submitButtonLabel,
  isSubmitDisabled,
  inputRef,
  accept,
  multiple,
  onFileChange,
  children,
}: ReferenceUploadShellProps) {
  return (
    <div
      data-ai-video-studio-reference-upload-shell={kind}
      className="space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        {label}
        {supportsUpload ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="text-xs">{useUrlLabel}</span>
            <Switch
              checked={isUrlMode}
              onCheckedChange={onUrlModeChange}
              disabled={disabled || isUploading}
            />
          </div>
        ) : null}
      </div>

      {supportsUpload && !isUrlMode && showUploadArea ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploadDisabled}
            className={cn(
              "flex min-h-[100px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-background/40 px-4 py-4 text-center transition",
              "hover:border-foreground/25 hover:bg-background/70",
              isUploadDisabled &&
                "cursor-not-allowed opacity-60 hover:border-border/80 hover:bg-background/40",
            )}
          >
            {isUploading ? (
              <Loader2 className="mb-3 size-7 animate-spin text-muted-foreground" />
            ) : (
              <span className="mb-3 inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="size-4" />
              </span>
            )}
            <span className="text-xs text-foreground">
              {isUploading ? uploadingText : uploadTitle}
            </span>
            {formatsLabel ? (
              <span className="mt-1 text-[10px] text-muted-foreground">
                {formatsLabel}
              </span>
            ) : null}
          </button>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      ) : supportsUpload && !isUrlMode ? null : (
        <div className="flex items-center gap-3">
          <Input
            id={inputId}
            type="url"
            value={urlValue}
            onChange={(event) => onUrlValueChange(event.target.value)}
            placeholder={urlPlaceholder}
            disabled={Boolean(isUrlInputDisabled)}
            className="h-10 rounded-xl bg-background/60 text-base"
          />
          <Button
            type="button"
            variant="outline"
            onClick={onSubmitUrl}
            disabled={isSubmitDisabled}
            className="h-10 rounded-xl px-3 "
          >
            {submitButtonLabel}
          </Button>
        </div>
      )}

      {children}
    </div>
  );
}

export default function ReferenceField({
  field,
  inputId,
  label,
  value,
  disabled,
  labelIcon,
  labelTitle,
  texts,
  onMetadataChange,
  onChange,
}: ReferenceFieldProps) {
  const fieldKind = resolveReferenceFieldKind(field);
  const mergedTexts = useMemo(
    () => ({
      ...getDefaultReferenceFieldTexts(),
      ...texts,
    }),
    [texts],
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUrlMode, setIsUrlMode] = useState(fieldKind === "url");
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  if (!fieldKind) {
    return null;
  }

  const urls = getUrls(value);
  const { maxItems, isMultiple } = getReferenceFieldCapacity(field);
  const countText = mergedTexts.showCountLabel
    ? mergedTexts.countLabel(urls.length, maxItems)
    : null;
  const supportsUpload = fieldKind !== "url";
  const isUploadDisabled =
    Boolean(disabled) ||
    isUploading ||
    !supportsUpload ||
    urls.length >= maxItems;

  const applyUrls = (nextUrls: string[]) => {
    const limited = nextUrls.slice(0, maxItems);
    onChange(toFieldValue(field, limited));
  };

  const handleAddUrl = async () => {
    const trimmed = urlInput.trim();

    if (!validateReferenceUrl(trimmed)) {
      toast.error(mergedTexts.invalidUrl);
      return;
    }

    if (fieldKind === "video") {
      setIsUploading(true);

      try {
        const prepared = await prepareVideoReferenceUrl({
          url: trimmed,
        });

        if (!prepared) {
          toast.error(mergedTexts.videoDurationRequiredError);
          return;
        }

        onMetadataChange?.({
          videoDurationsByUrl: {
            [prepared.url]: prepared.duration,
          },
        });
      } finally {
        setIsUploading(false);
      }
    }

    if (fieldKind === "audio") {
      setIsUploading(true);

      try {
        const prepared = await prepareAudioReferenceUrl({
          url: trimmed,
        });

        if (!prepared) {
          toast.error(mergedTexts.audioDurationRequiredError);
          return;
        }

        onMetadataChange?.({
          audioDurationsByUrl: {
            [prepared.url]: prepared.duration,
          },
        });
      } finally {
        setIsUploading(false);
      }
    }

    const nextUrls = isMultiple ? [...urls, trimmed] : [trimmed];
    applyUrls(nextUrls);
    setUrlInput("");
  };

  const handleRemove = (index: number) => {
    applyUrls(urls.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || !supportsUpload) {
      return;
    }

    const uploadKind = fieldKind as Exclude<ReferenceFieldKind, "url">;
    const config = getReferenceUploadConfig(uploadKind);
    const availableSlots = Math.max(0, maxItems - urls.length);
    const files = Array.from(fileList).slice(0, availableSlots);

    if (files.length === 0) {
      return;
    }

    try {
      setIsUploading(true);
      const uploadedUrls: string[] = [];
      const uploadedVideoDurations: Record<string, number> = {};
      const uploadedAudioDurations: Record<string, number> = {};

      for (const file of files) {
        if (uploadKind === "image" && !file.type.startsWith("image/")) {
          throw new Error(mergedTexts.imageOnlyError);
        }

        if (uploadKind === "video" && !file.type.startsWith("video/")) {
          throw new Error(mergedTexts.videoOnlyError);
        }

        if (uploadKind === "audio" && !file.type.startsWith("audio/")) {
          throw new Error(mergedTexts.audioOnlyError);
        }

        if (file.size > config.maxSize) {
          throw new Error(mergedTexts.uploadTooLarge(config.maxSize / 1024 / 1024));
        }

        const duration =
          uploadKind === "video"
            ? await getVideoDurationFromFile(file)
            : uploadKind === "audio"
              ? await getAudioDurationFromFile(file)
            : null;

        if (uploadKind === "video" && duration === null) {
          throw new Error(mergedTexts.videoDurationRequiredError);
        }

        if (uploadKind === "audio" && duration === null) {
          throw new Error(mergedTexts.audioDurationRequiredError);
        }

        const uploadedUrl = await uploadReferenceFile({
          kind: uploadKind,
          file,
        });

        uploadedUrls.push(uploadedUrl);

        if (uploadKind === "video" && duration !== null) {
          uploadedVideoDurations[uploadedUrl] = duration;
        }

        if (uploadKind === "audio" && duration !== null) {
          uploadedAudioDurations[uploadedUrl] = duration;
        }
      }

      applyUrls(isMultiple ? [...urls, ...uploadedUrls] : uploadedUrls);

      if (uploadKind === "video" && onMetadataChange && Object.keys(uploadedVideoDurations).length > 0) {
        onMetadataChange({
          videoDurationsByUrl: uploadedVideoDurations,
        });
      }

      if (uploadKind === "audio" && onMetadataChange && Object.keys(uploadedAudioDurations).length > 0) {
        onMetadataChange({
          audioDurationsByUrl: uploadedAudioDurations,
        });
      }
    } catch (error) {
      toast.error(getErrorMessage(error) || mergedTexts.uploadFailed);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div
      data-ai-video-studio-reference-field={fieldKind}
      data-ai-video-studio-reference-multiple={String(isMultiple)}
      className="space-y-3"
    >
      <ReferenceUploadShell
        kind={fieldKind}
        inputId={inputId}
        label={(
          <div
            title={labelTitle}
            data-ai-video-studio-field-description-trigger={labelTitle ? "true" : undefined}
            onClick={labelTitle ? () => toast.info(labelTitle) : undefined}
            className={cn(
              "inline-flex items-center gap-2 font-medium text-muted-foreground text-sm",
              labelTitle && "cursor-pointer transition hover:text-foreground active:opacity-80",
            )}
          >
            {labelIcon ? <span className="size-4 text-muted-foreground">{labelIcon}</span> : null}
            <span>{label}</span>
            {countText ? (
              <span className="text-xs font-medium text-muted-foreground">
                {countText}
              </span>
            ) : null}
          </div>
        )}
        disabled={disabled}
        supportsUpload={supportsUpload}
        isUrlMode={isUrlMode}
        onUrlModeChange={setIsUrlMode}
        isUploading={isUploading}
        isUploadDisabled={isUploadDisabled}
        uploadTitle={mergedTexts.uploadTitle}
        uploadingText={mergedTexts.uploading}
        formatsLabel={getFormatsLabel(fieldKind, mergedTexts)}
        useUrlLabel={mergedTexts.useUrlLabel}
        urlPlaceholder={getUrlPlaceholder(fieldKind, mergedTexts)}
        urlValue={urlInput}
        onUrlValueChange={setUrlInput}
        onSubmitUrl={handleAddUrl}
        submitButtonLabel={mergedTexts.addButton}
        isUrlInputDisabled={Boolean(disabled || urls.length >= maxItems)}
        isSubmitDisabled={Boolean(
          disabled || !urlInput.trim() || urls.length >= maxItems,
        )}
        inputRef={inputRef}
        accept={supportsUpload
          ? getReferenceUploadConfig(fieldKind as Exclude<ReferenceFieldKind, "url">).accept
          : undefined}
        multiple={isMultiple}
        onFileChange={(event) => void handleUpload(event.target.files)}
      >
        {urls.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {urls.map((item, index) => (
              <div
                key={`${item}-${index}`}
                data-ai-video-studio-reference-card={fieldKind}
                className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-background/50"
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  className="absolute right-2 top-2 z-10 size-7 rounded-full bg-background/90 shadow-sm"
                >
                  <Trash2 className="size-4" />
                </Button>
                {fieldKind === "url" ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
                    <div className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Link2 className="size-5" />
                    </div>
                    <div className="line-clamp-3 break-all text-xs font-medium text-foreground">
                      {item}
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full">
                    {renderReferencePreview(fieldKind, item)}
                  </div>
                )}
                {fieldKind !== "audio" && fieldKind !== "url" ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
                    <div className="truncate text-xs font-medium text-white">
                      {getReferenceDisplayName(item)}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </ReferenceUploadShell>
    </div>
  );
}
