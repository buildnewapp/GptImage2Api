"use client";

import ImageUploader from "@/components/ai-demo/shared/ImageUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";
import {
  Clock,
  Dices,
  FileText,
  Hash,
  Image as ImageIcon,
  List,
  Monitor,
  Shield,
  Video,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type AIVideoStudioFieldControlProps = {
  field: AiVideoStudioFieldDescriptor;
  label: string;
  value: unknown;
  disabled?: boolean;
  compact?: boolean;
  useUrlLabel?: string;
  promptPlaceholder?: string;
  onChange: (value: unknown) => void;
};

function titleCase(input: string) {
  return input
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getEnumOptionLabel(field: AiVideoStudioFieldDescriptor, value: string) {
  if (field.key === "n_frames") {
    return `${value}s`;
  }

  return titleCase(value);
}

function getStringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").join(", ")
    : "";
}

function getImageValue(value: unknown) {
  if (Array.isArray(value)) {
    const first = value.find((item): item is string => typeof item === "string");
    return first ?? null;
  }

  return typeof value === "string" ? value : null;
}

function isRemoteImageUrl(value: string | null) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

type AiVideoStudioFieldIconName =
  | "clock"
  | "file-text"
  | "hash"
  | "image"
  | "list"
  | "monitor"
  | "shield"
  | "video";

export function getAiVideoStudioFieldIconName(
  field: Pick<AiVideoStudioFieldDescriptor, "key" | "kind">,
): AiVideoStudioFieldIconName {
  if (field.kind === "image") {
    return "image";
  }

  if (field.kind === "prompt") {
    return "file-text";
  }

  if (field.key === "n_frames" || field.key === "duration") {
    return "clock";
  }

  if (field.key === "aspect_ratio") {
    return "video";
  }

  if (field.key === "resolution") {
    return "monitor";
  }

  if (field.kind === "boolean") {
    return "shield";
  }

  if (field.kind === "string-array") {
    return "list";
  }

  return "hash";
}

function getFieldIcon(field: AiVideoStudioFieldDescriptor) {
  switch (getAiVideoStudioFieldIconName(field)) {
    case "image":
      return ImageIcon;
    case "file-text":
      return FileText;
    case "clock":
      return Clock;
    case "video":
      return Video;
    case "monitor":
      return Monitor;
    case "shield":
      return Shield;
    case "list":
      return List;
    case "hash":
    default:
      return Hash;
  }
}

type HorizontalDragScrollSession = {
  startClientX: number;
  startScrollLeft: number;
};

export function beginHorizontalDragScroll(
  startClientX: number,
  startScrollLeft: number,
): HorizontalDragScrollSession {
  return {
    startClientX,
    startScrollLeft,
  };
}

export function updateHorizontalDragScroll(
  session: HorizontalDragScrollSession,
  currentClientX: number,
) {
  return session.startScrollLeft - (currentClientX - session.startClientX);
}

const RANDOM_SEED_MAX_EXCLUSIVE = 2147483647;

export function createRandomSeedValue() {
  return Math.floor(Math.random() * RANDOM_SEED_MAX_EXCLUSIVE);
}

function renderFieldLabel(
  field: AiVideoStudioFieldDescriptor,
  label: string,
  htmlFor?: string,
  compact = false,
) {
  const Icon = getFieldIcon(field);

  return (
    <Label
      htmlFor={htmlFor}
      className={cn(
        "flex items-center font-medium text-muted-foreground",
        compact ? "gap-1.5 text-[13px]" : "gap-2 text-sm",
      )}
    >
      <Icon className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <span>{label}</span>
    </Label>
  );
}

function getFieldRootClassName(compact = false) {
  return compact ? "space-y-1" : "space-y-2";
}

function getInputClassName(compact = false, className?: string) {
  return cn(
    compact
      ? "h-8 w-32 bg-transparent px-0 text-[13px] shadow-none"
      : "rounded-xl bg-background/60",
    className,
  );
}

function getAspectRatioOptionLabel(value: string) {
  if (value === "auto") {
    return "Auto";
  }

  return titleCase(value);
}

function getAspectRatioPreview(value: string): ReactNode {
  return (
    <div
      className={cn(
        "rounded-[4px] border border-current opacity-80",
        value === "21:9" && "h-[14px] w-8",
        (value === "16:9" || value === "landscape") && "h-[18px] w-8",
        (value === "9:16" || value === "portrait") && "h-8 w-[18px]",
        value === "9:21" && "h-8 w-[14px]",
        value === "1:1" && "h-7 w-7",
        value === "4:3" && "h-[21px] w-7",
        value === "3:4" && "h-7 w-[21px]",
        value === "auto" && "h-6 w-6 rounded-full",
      )}
    />
  );
}

export default function AIVideoStudioFieldControl({
  field,
  label,
  value,
  disabled,
  compact = false,
  useUrlLabel = "Use URL",
  promptPlaceholder,
  onChange,
}: AIVideoStudioFieldControlProps) {
  const imageValue = getImageValue(value);
  const [useUrl, setUseUrl] = useState(() => isRemoteImageUrl(imageValue));

  useEffect(() => {
    if (!imageValue) {
      return;
    }

    setUseUrl(isRemoteImageUrl(imageValue));
  }, [imageValue]);

  if (field.kind === "prompt") {
    return (
      <div className={getFieldRootClassName(compact)}>
        {renderFieldLabel(field, label, field.key, compact)}
        <Textarea
          id={field.key}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          maxLength={field.schema.maxLength}
          className={cn(
            compact
              ? "min-h-24 rounded-xl border-0 bg-muted/30 text-[13px] shadow-none focus-visible:border-transparent focus-visible:ring-0"
              : "min-h-24 rounded-xl bg-background/60",
          )}
          placeholder={promptPlaceholder}
        />
      </div>
    );
  }

  if (field.kind === "image") {
    return (
      <div className={getFieldRootClassName(compact)}>
        <div className="flex items-center justify-between gap-3">
          {renderFieldLabel(field, label, undefined, compact)}
          <div className="flex items-center gap-2">
            <span className={cn("text-muted-foreground", compact ? "text-[13px]" : "text-sm")}>
              {useUrlLabel}
            </span>
            <Switch
              checked={useUrl}
              onCheckedChange={(nextChecked) => {
                setUseUrl(nextChecked);
                if (nextChecked && imageValue?.startsWith("data:")) {
                  onChange(field.schema.type === "array" ? [] : "");
                }
              }}
              disabled={disabled}
              className={cn(compact && "scale-90")}
            />
          </div>
        </div>
        {useUrl ? (
          <Input
            type="url"
            value={isRemoteImageUrl(imageValue) ? imageValue ?? "" : ""}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (field.schema.type === "array") {
                onChange(nextValue ? [nextValue] : []);
                return;
              }
              onChange(nextValue);
            }}
            disabled={disabled}
            className={getInputClassName(compact)}
            placeholder="https://example.com/source-image.webp"
          />
        ) : (
          <ImageUploader
            value={imageValue}
            onChange={(nextValue) => {
              if (field.schema.type === "array") {
                onChange(nextValue ? [nextValue] : []);
                return;
              }
              onChange(nextValue);
            }}
            disabled={disabled}
            className="rounded-xl bg-background/40"
          />
        )}
      </div>
    );
  }

  if (field.kind === "enum") {
    const options = Array.isArray(field.schema.enum)
      ? field.schema.enum.filter((item): item is string => typeof item === "string")
      : [];

    if (field.key === "aspect_ratio") {
      return (
        <div className={getFieldRootClassName(compact)}>
          {renderFieldLabel(field, label, undefined, compact)}
          <div
            className={cn(
              "flex flex-row flex-nowrap overflow-x-auto py-1 scrollbar-thin",
              compact ? "gap-1" : "gap-2",
            )}
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#d1d5db transparent",
            }}
          >
            {options.map((option) => (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => onChange(option)}
                className={cn(
                  "flex min-w-[62px] flex-col items-center justify-center gap-1 font-medium transition-colors",
                  compact
                    ? "min-h-16 rounded-xl border-0 px-2 py-1 text-[13px]"
                    : "min-h-18 rounded-2xl  px-2 py-1 text-sm",
                  value === option
                    ? compact
                      ? "bg-foreground text-background"
                      : "border-blue-400/70 bg-blue-500/10 text-blue-700 dark:text-blue-300 border"
                    : compact
                      ? "bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                {getAspectRatioPreview(option)}
                <span>{getAspectRatioOptionLabel(option)}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={getFieldRootClassName(compact)}>
        {renderFieldLabel(field, label, undefined, compact)}
        <div className={cn("flex flex-wrap", compact ? "gap-1.5" : "gap-2")}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option)}
              className={cn(
                "min-w-[72px] font-medium transition-colors",
                compact
                  ? "rounded-lg border-0 px-3 py-1.5 text-[13px]"
                  : "rounded-xl border px-4 py-2 text-sm",
                value === option
                  ? compact
                    ? "bg-foreground text-background"
                    : "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                  : compact
                    ? "bg-muted/40 text-foreground hover:bg-muted/60"
                    : "border-border/60 bg-background/60 text-foreground hover:bg-muted/40",
              )}
            >
              {getEnumOptionLabel(field, option)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.kind === "boolean") {
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3",
          compact && "gap-3 rounded-none border-0 bg-transparent px-0 py-1",
        )}
      >
        {renderFieldLabel(field, label, field.key, compact)}
        <Switch
          id={field.key}
          checked={Boolean(value)}
          onCheckedChange={onChange}
          disabled={disabled}
          className={cn(compact && "scale-90")}
        />
      </div>
    );
  }

  if (field.kind === "string-array") {
    return (
      <div className={getFieldRootClassName(compact)}>
        {renderFieldLabel(field, label, field.key, compact)}
        <Input
          id={field.key}
          value={getStringArrayValue(value)}
          onChange={(event) =>
            onChange(
              event.target.value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            )
          }
          disabled={disabled}
          className={getInputClassName(compact)}
          placeholder="id_1, id_2"
        />
      </div>
    );
  }

  if (field.kind === "number") {
    if (compact && field.key === "seed") {
      return (
        <div
          className="flex items-center justify-between gap-3 py-1"
          data-compact-seed-row="true"
        >
          {renderFieldLabel(field, label, field.key, true)}
          <div className="flex min-w-0 items-center justify-end gap-2">
            <Input
              id={field.key}
              type="number"
              value={typeof value === "number" || typeof value === "string" ? value : ""}
              onChange={(event) => {
                const nextValue = event.target.value;
                onChange(nextValue === "" ? "" : Number(nextValue));
              }}
              disabled={disabled}
              min={field.schema.minimum}
              max={field.schema.maximum}
              step={field.schema.step}
              className={getInputClassName(
                true,
                "max-w-[180px] text-right tabular-nums",
              )}
            />
            <button
              type="button"
              aria-label="Randomize seed"
              onClick={() => onChange(createRandomSeedValue())}
              disabled={disabled}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <Dices className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={getFieldRootClassName(compact)}>
        {renderFieldLabel(field, label, field.key, compact)}
        <Input
          id={field.key}
          type="number"
          value={typeof value === "number" || typeof value === "string" ? value : ""}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue === "" ? "" : Number(nextValue));
          }}
          disabled={disabled}
          min={field.schema.minimum}
          max={field.schema.maximum}
          step={field.schema.step}
          className={getInputClassName(compact)}
        />
      </div>
    );
  }

  return (
    <div className={getFieldRootClassName(compact)}>
      {renderFieldLabel(field, label, field.key, compact)}
      <Input
        id={field.key}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={getInputClassName(compact)}
      />
    </div>
  );
}
