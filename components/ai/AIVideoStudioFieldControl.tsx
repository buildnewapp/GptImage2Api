"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";

type AIVideoStudioFieldControlProps = {
  field: AiVideoStudioFieldDescriptor;
  label: string;
  value: unknown;
  disabled?: boolean;
  compact?: boolean;
  onChange: (value: unknown) => void;
};

function getStringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").join(", ")
    : "";
}

export function beginHorizontalDragScroll(
  startClientX: number,
  startScrollLeft: number,
) {
  return {
    startClientX,
    startScrollLeft,
  };
}

export function updateHorizontalDragScroll(
  session: { startClientX: number; startScrollLeft: number },
  currentClientX: number,
) {
  return session.startScrollLeft - (currentClientX - session.startClientX);
}

function renderFieldLabel(
  label: string,
  htmlFor?: string,
  compact = false,
) {
  return (
    <Label
      htmlFor={htmlFor}
      className={cn(
        "font-medium text-muted-foreground",
        compact ? "text-[13px]" : "text-sm",
      )}
    >
      {label}
    </Label>
  );
}

function getFieldRootClassName(compact = false) {
  return compact ? "space-y-1 flex flex-row justify-between" : "space-y-2";
}

function getInputClassName(compact = false, className?: string) {
  return cn(
    compact
      ? "h-8 w-32 bg-transparent px-2 text-[13px] shadow-none"
      : "rounded-xl bg-background/60",
    className,
  );
}

export default function AIVideoStudioFieldControl({
  field,
  label,
  value,
  disabled,
  compact = false,
  onChange,
}: AIVideoStudioFieldControlProps) {
  const inputId =
    Array.isArray(field.path) && field.path.length > 0
      ? field.path.join("__")
      : field.key;

  if (field.kind === "enum") {
    const options = Array.isArray(field.schema.enum)
      ? field.schema.enum.filter(
          (item): item is string | number =>
            typeof item === "string" || typeof item === "number",
        )
      : [];

    return (
      <div className={getFieldRootClassName(compact)}>
        {renderFieldLabel(label, inputId, compact)}
        <select
          id={inputId}
          value={
            typeof value === "string" || typeof value === "number"
              ? String(value)
              : String(options[0] ?? "")
          }
          onChange={(event) => {
            const matched = options.find((option) => String(option) === event.target.value);
            onChange(matched ?? event.target.value);
          }}
          disabled={disabled}
          className={cn(
            getInputClassName(compact),
            "w-full border border-border/60 px-3",
          )}
        >
          {options.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
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
        {renderFieldLabel(label, inputId, compact)}
        <Switch
          id={inputId}
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
        {renderFieldLabel(label, inputId, compact)}
        <Input
          id={inputId}
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
        />
      </div>
    );
  }

  if (field.kind === "number") {
    return (
      <div className={getFieldRootClassName(compact)}>
        {renderFieldLabel(label, inputId, compact)}
        <Input
          id={inputId}
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
      {renderFieldLabel(label, inputId, compact)}
      <Input
        id={inputId}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={getInputClassName(compact)}
      />
    </div>
  );
}
