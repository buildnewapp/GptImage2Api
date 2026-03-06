"use client";

import { generateUserPresignedUploadUrl } from "@/actions/r2-resources";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { VIDEO_INPUT_IMAGE_PATH } from "@/config/common";
import { getErrorMessage } from "@/lib/error-utils";
import { cn } from "@/lib/utils";
import {
  Camera,
  ChevronDown,
  Clock,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  Monitor,
  Shield,
  Sparkles,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

/* ─── Image Upload ─── */

type ImageUploadFieldProps = {
  imageUrl: string | undefined;
  onChange: (url: string | undefined) => void;
  t: TranslateFn;
};

export function ImageUploadField({ imageUrl, onChange, t }: ImageUploadFieldProps) {
  const [useUrl, setUseUrl] = useState(
    () => !!imageUrl && /^https?:\/\//.test(imageUrl),
  );
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!imageUrl) return;
    if (/^https?:\/\//.test(imageUrl)) setUseUrl(true);
  }, [imageUrl]);

  const handleUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error(t("form.imageOnlyError"));
        return;
      }
      if (file.size > MAX_UPLOAD_SIZE) {
        toast.error(t("form.uploadTooLarge"));
        return;
      }
      setIsUploading(true);
      try {
        const uploadToken = await generateUserPresignedUploadUrl({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          path: VIDEO_INPUT_IMAGE_PATH,
          prefix: "seedance-input",
        });
        if (!uploadToken.success || !uploadToken.data) {
          throw new Error(uploadToken.error || "Failed to prepare upload.");
        }
        const uploadResponse = await fetch(uploadToken.data.presignedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!uploadResponse.ok) {
          let details = "";
          try { details = await uploadResponse.text(); } catch { /* ignore */ }
          throw new Error(details || `Upload failed: ${uploadResponse.status}`);
        }
        onChange(uploadToken.data.publicObjectUrl);
        setUseUrl(false);
        toast.success(t("form.uploadSuccess"));
      } catch (error) {
        toast.error(getErrorMessage(error) || t("form.uploadFailed"));
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    },
    [onChange, t],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          {t("form.images")}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {t("form.useUrl")}
          </span>
          <div
            className={cn(
              "w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-200",
              useUrl ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700",
            )}
            onClick={() => setUseUrl((prev) => !prev)}
          >
            <div
              className={cn(
                "w-4 h-4 rounded-full shadow-sm bg-white dark:bg-black transition-transform duration-200",
                useUrl ? "translate-x-4" : "translate-x-0",
              )}
            />
          </div>
        </div>
      </div>

      {useUrl ? (
        <input
          type="url"
          value={imageUrl || ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="https://example.com/source-image.webp"
          className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      ) : isUploading ? (
        <div className="h-40 rounded-xl border border-border/50 bg-background/30 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t("form.uploadingImage")}</span>
        </div>
      ) : imageUrl ? (
        <div className="relative rounded-xl border border-border/50 overflow-hidden group">
          <img src={imageUrl} alt="Uploaded" className="w-full h-40 object-cover transition-transform group-hover:scale-105" />
          <button
            onClick={() => onChange(undefined)}
            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="relative border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ease-in-out h-40 flex flex-col items-center justify-center border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 group">
          <input accept="image/*,.png,.jpg,.jpeg,.webp" className="sr-only" type="file" onChange={handleUpload} />
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-3 group-hover:scale-110 transition-transform duration-300">
            <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">{t("form.uploadTitle")}</p>
          <p className="text-xs text-muted-foreground uppercase font-medium">{t("form.uploadFormats")}</p>
        </label>
      )}
    </div>
  );
}

/* ─── End Image Upload (optional tail-frame for v1-lite-image-to-video) ─── */

type EndImageUploadFieldProps = {
  endImageUrl: string | undefined;
  onChange: (url: string | undefined) => void;
  t: TranslateFn;
};

export function EndImageUploadField({ endImageUrl, onChange, t }: EndImageUploadFieldProps) {
  const [useUrl, setUseUrl] = useState(
    () => !!endImageUrl && /^https?:\/\//.test(endImageUrl),
  );
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!endImageUrl) return;
    if (/^https?:\/\//.test(endImageUrl)) setUseUrl(true);
  }, [endImageUrl]);

  const handleUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error(t("form.imageOnlyError"));
        return;
      }
      if (file.size > MAX_UPLOAD_SIZE) {
        toast.error(t("form.uploadTooLarge"));
        return;
      }
      setIsUploading(true);
      try {
        const uploadToken = await generateUserPresignedUploadUrl({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          path: VIDEO_INPUT_IMAGE_PATH,
          prefix: "seedance-end-frame",
        });
        if (!uploadToken.success || !uploadToken.data) {
          throw new Error(uploadToken.error || "Failed to prepare upload.");
        }
        const uploadResponse = await fetch(uploadToken.data.presignedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!uploadResponse.ok) {
          let details = "";
          try { details = await uploadResponse.text(); } catch { /* ignore */ }
          throw new Error(details || `Upload failed: ${uploadResponse.status}`);
        }
        onChange(uploadToken.data.publicObjectUrl);
        setUseUrl(false);
        toast.success(t("form.uploadSuccess"));
      } catch (error) {
        toast.error(getErrorMessage(error) || t("form.uploadFailed"));
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    },
    [onChange, t],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          {t("form.addEndFrame")}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {t("form.useUrl")}
          </span>
          <div
            className={cn(
              "w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-200",
              useUrl ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700",
            )}
            onClick={() => setUseUrl((prev) => !prev)}
          >
            <div
              className={cn(
                "w-4 h-4 rounded-full shadow-sm bg-white dark:bg-black transition-transform duration-200",
                useUrl ? "translate-x-4" : "translate-x-0",
              )}
            />
          </div>
        </div>
      </div>

      {useUrl ? (
        <input
          type="url"
          value={endImageUrl || ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="https://example.com/end-frame.webp"
          className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      ) : isUploading ? (
        <div className="h-28 rounded-xl border border-border/50 bg-background/30 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t("form.uploadingImage")}</span>
        </div>
      ) : endImageUrl ? (
        <div className="relative rounded-xl border border-border/50 overflow-hidden group">
          <img src={endImageUrl} alt="End frame" className="w-full h-28 object-cover transition-transform group-hover:scale-105" />
          <button
            onClick={() => onChange(undefined)}
            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="relative border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ease-in-out h-28 flex flex-col items-center justify-center border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 group">
          <input accept="image/*,.png,.jpg,.jpeg,.webp" className="sr-only" type="file" onChange={handleUpload} />
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-2 group-hover:scale-110 transition-transform duration-300">
            <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-xs font-semibold text-foreground mb-0.5">{t("form.uploadTitle")}</p>
          <p className="text-[10px] text-muted-foreground uppercase font-medium">{t("form.uploadFormats")}</p>
        </label>
      )}
    </div>
  );
}

/* ─── Prompt ─── */

type PromptFieldProps = {
  prompt: string | undefined;
  onChange: (prompt: string) => void;
  t: TranslateFn;
};

export function PromptField({ prompt, onChange, t }: PromptFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
        <FileText className="w-4 h-4" />
        {t("form.prompt")}
      </label>
      <div className="relative">
        <textarea
          className="flex border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm w-full resize-none rounded-xl bg-background/50 backdrop-blur-sm border-border/50 p-4 text-base focus:border-primary/50 focus:ring-primary/20 transition-all shadow-sm min-h-[120px]"
          placeholder={t("form.promptPlaceholder")}
          maxLength={10000}
          value={prompt || ""}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="absolute bottom-3 right-3 text-[10px] font-medium text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border/50 shadow-sm">
          <span>{(prompt || "").length}/10000</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Resolution Selector ─── */

type ResolutionSelectorProps = {
  resolutions: string[];
  selected: string | undefined;
  onChange: (value: string) => void;
  t: TranslateFn;
};

export function ResolutionSelector({ resolutions, selected, onChange, t }: ResolutionSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Monitor className="w-4 h-4" />
        {t("form.resolution")}
      </label>
      <div className="flex flex-wrap gap-2">
        {resolutions.map((item) => (
          <button
            key={item}
            onClick={() => onChange(item)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all border shadow-sm",
              selected === item
                ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                : "bg-background border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Size / Quality Selector ─── */

type SizeSelectorProps = {
  sizes: string[];
  selected: string | undefined;
  onChange: (value: string) => void;
  t: TranslateFn;
};

export function SizeSelector({ sizes, selected, onChange, t }: SizeSelectorProps) {
  const labelMap: Record<string, string> = {
    standard: "Standard",
    high: "High",
  };
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Monitor className="w-4 h-4" />
        {t("form.size")}
      </label>
      <div className="flex flex-wrap gap-2">
        {sizes.map((item) => (
          <button
            key={item}
            onClick={() => onChange(item)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all border shadow-sm",
              selected === item
                ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                : "bg-background border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            {labelMap[item] ?? item}
          </button>
        ))}
      </div>
    </div>
  );
}


/* ─── Duration Selector ─── */

type DurationSelectorProps = {
  durations: string[];
  selected: string | undefined;
  onChange: (value: string) => void;
  t: TranslateFn;
};

export function DurationSelector({ durations, selected, onChange, t }: DurationSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Clock className="w-4 h-4" />
        {t("form.duration")}
      </label>
      <div className="flex flex-wrap gap-2">
        {durations.map((item) => (
          <button
            key={item}
            onClick={() => onChange(item)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all border shadow-sm",
              selected === item
                ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                : "bg-background border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Aspect Ratio Selector ─── */

type AspectRatioSelectorProps = {
  aspectRatios: string[];
  selected: string | undefined;
  onChange: (value: string) => void;
  t: TranslateFn;
};

export function AspectRatioSelector({ aspectRatios, selected, onChange, t }: AspectRatioSelectorProps) {
  const labelMap: Record<string, string> = {
    landscape: "Landscape",
    portrait: "Portrait",
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Video className="w-4 h-4" />
        {t("form.aspectRatio")}
      </label>
      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
        {aspectRatios.map((ratio) => (
          <button
            key={ratio}
            onClick={() => onChange(ratio)}
            className={cn(
              "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border-2 p-1 transition-all gap-2",
              selected === ratio
                ? "border-primary/50 bg-primary/5 text-primary shadow-sm"
                : "border-transparent bg-muted/20 text-muted-foreground hover:bg-muted/40",
            )}
            title={ratio}
          >
            {ratio === "auto" ? (
              <Sparkles className="w-5 h-5" />
            ) : (
              <div
                className={cn(
                  "rounded-[2px] border border-current opacity-80",
                  ratio === "21:9" && "w-8 h-[14px]",
                  ratio === "16:9" && "w-8 h-[18px]",
                  ratio === "landscape" && "w-8 h-[18px]",
                  ratio === "9:16" && "w-[18px] h-8",
                  ratio === "portrait" && "w-[18px] h-8",
                  ratio === "9:21" && "w-[14px] h-8",
                  ratio === "1:1" && "w-7 h-7",
                  ratio === "4:3" && "w-7 h-[21px]",
                  ratio === "3:4" && "w-[21px] h-7",
                )}
              />
            )}
            <span className="text-[10px] font-medium leading-none opacity-80">
              {ratio === "auto" ? t("form.auto") : (labelMap[ratio] ?? ratio)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Advanced Settings (seed, cameraFixed, safetyChecker, isPublic) ─── */

type AdvancedSettingsProps = {
  values: {
    seed?: string;
    cameraFixed?: boolean;
    enableSafetyChecker?: boolean;
    watermark?: string;
    enableTranslation?: boolean;
  };
  onChange: (next: Record<string, unknown>) => void;
  isPublic: boolean;
  onPublicChange: (next: boolean) => void;
  supportsSeed?: boolean;
  supportsCameraFixed?: boolean;
  supportsSafetyChecker?: boolean;
  supportsWatermark?: boolean;
  supportsTranslation?: boolean;
  t: TranslateFn;
};

export function AdvancedSettings({
  values,
  onChange,
  isPublic,
  onPublicChange,
  supportsSeed = false,
  supportsCameraFixed = false,
  supportsSafetyChecker = false,
  supportsWatermark = false,
  supportsTranslation = false,
  t,
}: AdvancedSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const safetyEnabled = values.enableSafetyChecker !== false;
  const translationEnabled = values.enableTranslation !== false;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="rounded-xl border border-border/60 bg-background/40"
    >
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground">
        <span>{t("form.advanced")}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-3">
        {supportsSeed && (
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 shrink-0">
              <Sparkles className="w-4 h-4" />
              {t("form.seed")}
            </label>
            <div className="flex items-center gap-2 flex-1 max-w-[240px]">
              <input
                type="number"
                min={-1}
                max={2147483647}
                step={1}
                placeholder={t("form.randomSeed")}
                value={values.seed || ""}
                onChange={(e) => onChange({ seed: e.target.value })}
                className="flex-1 h-9 px-3 py-2 rounded-lg border border-border/50 bg-background/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
              <button
                type="button"
                title="Reload Seed"
                onClick={() => onChange({ seed: Math.floor(Math.random() * 1000000).toString() })}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {supportsCameraFixed && (
          <button
            type="button"
            onClick={() => onChange({ cameraFixed: !values.cameraFixed })}
            className="w-full flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground flex items-center gap-2">
              <Camera className="w-4 h-4" />
              {t("form.fixCamera")}
            </span>
            <div
              className={cn(
                "w-9 h-5 rounded-full p-0.5 transition-colors duration-200",
                values.cameraFixed ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700",
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full shadow-sm bg-white dark:bg-black transition-transform duration-200",
                  values.cameraFixed ? "translate-x-4" : "translate-x-0",
                )}
              />
            </div>
          </button>
        )}

        {supportsSafetyChecker && (
          <button
            type="button"
            onClick={() => onChange({ enableSafetyChecker: !safetyEnabled })}
            className="w-full flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {t("form.safetyChecker")}
            </span>
            <div
              className={cn(
                "w-9 h-5 rounded-full p-0.5 transition-colors duration-200",
                safetyEnabled ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700",
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full shadow-sm bg-white dark:bg-black transition-transform duration-200",
                  safetyEnabled ? "translate-x-4" : "translate-x-0",
                )}
              />
            </div>
          </button>
        )}

        {supportsWatermark && (
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 shrink-0">
              <FileText className="w-4 h-4" />
              {t("form.watermark")}
            </label>
            <div className="flex items-center gap-2 flex-1 max-w-[240px]">
              <input
                type="text"
                placeholder={t("form.watermarkPlaceholder")}
                value={values.watermark || ""}
                onChange={(e) => onChange({ watermark: e.target.value })}
                className="flex-1 h-9 px-3 py-2 rounded-lg border border-border/50 bg-background/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>
        )}

        {supportsTranslation && (
          <button
            type="button"
            onClick={() => onChange({ enableTranslation: !translationEnabled })}
            className="w-full flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {t("form.enableTranslation")}
            </span>
            <div
              className={cn(
                "w-9 h-5 rounded-full p-0.5 transition-colors duration-200",
                translationEnabled ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700",
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full shadow-sm bg-white dark:bg-black transition-transform duration-200",
                  translationEnabled ? "translate-x-4" : "translate-x-0",
                )}
              />
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={() => onPublicChange(!isPublic)}
          className="w-full flex items-center justify-between text-sm"
        >
          <span className="text-muted-foreground flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t("form.isPublic")}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {isPublic ? t("form.public") : t("form.private")}
            </span>
            <div
              className={cn(
                "w-9 h-5 rounded-full p-0.5 transition-colors duration-200",
                isPublic ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700",
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full shadow-sm bg-white dark:bg-black transition-transform duration-200",
                  isPublic ? "translate-x-4" : "translate-x-0",
                )}
              />
            </div>
          </div>
        </button>
      </CollapsibleContent>
    </Collapsible>
  );
}
/* ─── Shots Editor (Storyboard) ─── */

type ShotItemValue = {
  Scene: string;
  duration: number;
};

type ShotsEditorProps = {
  shots: ShotItemValue[];
  totalDuration: number; // n_frames in seconds
  onChange: (shots: ShotItemValue[]) => void;
  t: TranslateFn;
};

export function ShotsEditor({ shots, totalDuration, onChange, t }: ShotsEditorProps) {
  const currentTotal = shots.reduce((sum, s) => sum + s.duration, 0);
  const isOverBudget = currentTotal > totalDuration;
  const isUnderBudget = currentTotal < totalDuration;

  const handleSceneChange = (index: number, scene: string) => {
    const next = [...shots];
    next[index] = { ...next[index], Scene: scene };
    onChange(next);
  };

  const handleDurationChange = (index: number, value: string) => {
    const num = Number.parseFloat(value);
    if (value !== "" && (Number.isNaN(num) || num < 0)) return;
    const next = [...shots];
    next[index] = { ...next[index], duration: value === "" ? 0 : num };
    onChange(next);
  };

  const addShot = () => {
    const remaining = Math.max(0, totalDuration - currentTotal);
    const newDuration = remaining > 0 ? Math.round(remaining * 10) / 10 : 5;
    onChange([...shots, { Scene: "", duration: newDuration }]);
  };

  const removeShot = (index: number) => {
    if (shots.length <= 1) return;
    onChange(shots.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {t("form.shots")}
        </label>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full border",
            isOverBudget
              ? "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800"
              : isUnderBudget
                ? "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800"
                : "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800",
          )}
        >
          {t("form.totalDuration", {
            current: String(Math.round(currentTotal * 10) / 10),
            total: String(totalDuration),
          })}
        </span>
      </div>

      <div className="space-y-3">
        {shots.map((shot, index) => (
          <div
            key={index}
            className="relative rounded-xl border border-border/60 bg-background/40 p-3 space-y-2 group"
          >
            {/* Header: shot number + delete */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("form.shotNumber", { index: String(index + 1) })}
              </span>
              {shots.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeShot(index)}
                  className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scene description */}
            <textarea
              className="flex border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm w-full resize-none rounded-lg bg-background/50 backdrop-blur-sm border-border/50 p-3 text-sm focus:border-primary/50 focus:ring-primary/20 transition-all shadow-sm min-h-[80px]"
              placeholder={t("form.shotScene")}
              maxLength={5000}
              value={shot.Scene}
              onChange={(e) => handleSceneChange(index, e.target.value)}
            />

            {/* Duration input */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                <Clock className="w-3.5 h-3.5" />
                {t("form.shotDuration")}
              </label>
              <input
                type="number"
                min={0.5}
                max={totalDuration}
                step={0.5}
                value={shot.duration || ""}
                onChange={(e) => handleDurationChange(index, e.target.value)}
                className="w-20 h-7 px-2 py-1 rounded-md border border-border/50 bg-background/50 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add shot button */}
      <button
        type="button"
        onClick={addShot}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all text-sm font-medium"
      >
        <Sparkles className="w-4 h-4" />
        {t("form.addShot")}
      </button>
    </div>
  );
}

/* ─── Payload helpers ─── */

export function toApiDuration(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d+s$/.test(value)) return value.slice(0, -1);
  return value;
}

export function toHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const candidate = value.trim();
  if (!candidate) return undefined;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return candidate;
  } catch { /* ignore */ }
  return undefined;
}

export function toSeed(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  if (parsed < -1 || parsed > 2147483647) return undefined;
  return parsed;
}
