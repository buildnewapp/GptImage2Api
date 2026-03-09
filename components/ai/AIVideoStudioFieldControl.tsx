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
  FileText,
  Hash,
  Image as ImageIcon,
  List,
  Shield,
  Video,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type AIVideoStudioFieldControlProps = {
  field: AiVideoStudioFieldDescriptor;
  label: string;
  value: unknown;
  disabled?: boolean;
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

function getFieldIcon(field: AiVideoStudioFieldDescriptor) {
  if (field.kind === "image") {
    return ImageIcon;
  }

  if (field.kind === "prompt") {
    return FileText;
  }

  if (field.key === "n_frames") {
    return Clock;
  }

  if (field.key === "aspect_ratio") {
    return Video;
  }

  if (field.kind === "boolean") {
    return Shield;
  }

  if (field.kind === "string-array") {
    return List;
  }

  return Hash;
}

function renderFieldLabel(
  field: AiVideoStudioFieldDescriptor,
  label: string,
  htmlFor?: string,
) {
  const Icon = getFieldIcon(field);

  return (
    <Label
      htmlFor={htmlFor}
      className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Label>
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
      <div className="space-y-3">
        {renderFieldLabel(field, label, field.key)}
        <Textarea
          id={field.key}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          maxLength={field.schema.maxLength}
          className="min-h-32 rounded-xl bg-background/60"
          placeholder={promptPlaceholder}
        />
      </div>
    );
  }

  if (field.kind === "image") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          {renderFieldLabel(field, label)}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{useUrlLabel}</span>
            <Switch
              checked={useUrl}
              onCheckedChange={(nextChecked) => {
                setUseUrl(nextChecked);
                if (nextChecked && imageValue?.startsWith("data:")) {
                  onChange(field.schema.type === "array" ? [] : "");
                }
              }}
              disabled={disabled}
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
            className="rounded-xl bg-background/60"
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
        <div className="space-y-3">
          {renderFieldLabel(field, label)}
          <div className="flex flex-wrap gap-3">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => onChange(option)}
                className={cn(
                  "flex min-h-24 min-w-[96px] flex-col items-center justify-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-medium transition-colors",
                  value === option
                    ? "border-blue-400/70 bg-blue-500/10 text-blue-700 dark:text-blue-300"
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
      <div className="space-y-3">
        {renderFieldLabel(field, label)}
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option)}
              className={cn(
                "min-w-[72px] rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                value === option
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
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
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
        {renderFieldLabel(field, label, field.key)}
        <Switch
          id={field.key}
          checked={Boolean(value)}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      </div>
    );
  }

  if (field.kind === "string-array") {
    return (
      <div className="space-y-3">
        {renderFieldLabel(field, label, field.key)}
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
          className="rounded-xl bg-background/60"
          placeholder="id_1, id_2"
        />
      </div>
    );
  }

  if (field.kind === "number") {
    return (
      <div className="space-y-3">
        {renderFieldLabel(field, label, field.key)}
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
          className="rounded-xl bg-background/60"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {renderFieldLabel(field, label, field.key)}
      <Input
        id={field.key}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="rounded-xl bg-background/60"
      />
    </div>
  );
}
