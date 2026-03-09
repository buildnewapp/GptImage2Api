"use client";

import ImageUploader from "@/components/ai-demo/shared/ImageUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";

type AIVideoStudioFieldControlProps = {
  field: AiVideoStudioFieldDescriptor;
  label: string;
  value: unknown;
  disabled?: boolean;
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

export default function AIVideoStudioFieldControl({
  field,
  label,
  value,
  disabled,
  onChange,
}: AIVideoStudioFieldControlProps) {
  if (field.kind === "prompt") {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.key}>{label}</Label>
        <Textarea
          id={field.key}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          maxLength={field.schema.maxLength}
          className="min-h-32 rounded-xl bg-background/60"
          placeholder={field.schema.description || label}
        />
      </div>
    );
  }

  if (field.kind === "image") {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <ImageUploader
          value={getImageValue(value)}
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
      </div>
    );
  }

  if (field.kind === "enum") {
    const options = Array.isArray(field.schema.enum)
      ? field.schema.enum.filter((item): item is string => typeof item === "string")
      : [];

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
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
                  ? "border-blue-500/70 bg-blue-500/10 text-blue-700 dark:text-blue-300"
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
        <div className="space-y-1">
          <Label htmlFor={field.key}>{label}</Label>
          {typeof field.schema.description === "string" ? (
            <p className="text-xs text-muted-foreground">{field.schema.description}</p>
          ) : null}
        </div>
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
      <div className="space-y-2">
        <Label htmlFor={field.key}>{label}</Label>
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
      <div className="space-y-2">
        <Label htmlFor={field.key}>{label}</Label>
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
    <div className="space-y-2">
      <Label htmlFor={field.key}>{label}</Label>
      <Input
        id={field.key}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="rounded-xl bg-background/60"
        placeholder={field.schema.description || label}
      />
    </div>
  );
}
