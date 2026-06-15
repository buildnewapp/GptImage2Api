"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

type JsonSchema = Record<string, any>;

type ImageSizeOption = {
  label: string;
  value: string;
  width?: number;
  height?: number;
  custom?: boolean;
};

type ImageSizeFieldProps = {
  field: AiVideoStudioFieldDescriptor;
  inputId: string;
  label: string;
  value: unknown;
  disabled?: boolean;
  compact?: boolean;
  labelIcon?: ReactNode;
  labelTitle?: string;
  onChange: (value: unknown) => void;
};

export function isImageSizeFieldDescriptor(
  field: AiVideoStudioFieldDescriptor,
) {
  return field.schema["x-ui-control"] === "image-size";
}

function getImageSizeOptions(schema: JsonSchema): ImageSizeOption[] {
  const rawOptions = schema["x-ui-image-size-options"];
  if (!Array.isArray(rawOptions)) {
    return [];
  }

  return rawOptions
    .map((option): ImageSizeOption | null => {
      if (!option || typeof option !== "object" || Array.isArray(option)) {
        return null;
      }

      const record = option as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label : null;
      const optionValue =
        typeof record.value === "string" ? record.value : null;
      if (!label || !optionValue) {
        return null;
      }

      const width = Number(record.width);
      const height = Number(record.height);
      const hasDimensions = Number.isFinite(width) && Number.isFinite(height);

      return {
        label,
        value: optionValue,
        width: hasDimensions ? width : undefined,
        height: hasDimensions ? height : undefined,
        custom: record.custom === true,
      };
    })
    .filter((option): option is ImageSizeOption => option !== null);
}

function getImageSizeValue(value: unknown, schema: JsonSchema) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const width = Number(record.width);
    const height = Number(record.height);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      return {
        width: Math.round(width),
        height: Math.round(height),
      };
    }
  }

  const defaultValue = schema.default;
  if (
    defaultValue &&
    typeof defaultValue === "object" &&
    !Array.isArray(defaultValue)
  ) {
    const record = defaultValue as Record<string, unknown>;
    const width = Number(record.width);
    const height = Number(record.height);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      return {
        width: Math.round(width),
        height: Math.round(height),
      };
    }
  }

  return {
    width: 1024,
    height: 1024,
  };
}

function getImageSizeStringValue(value: unknown, schema: JsonSchema) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return typeof schema.default === "string" && schema.default.trim()
    ? schema.default
    : null;
}

function findImageSizeOption(
  options: ImageSizeOption[],
  size: { width: number; height: number },
) {
  return options.find(
    (option) =>
      !option.custom &&
      option.width === size.width &&
      option.height === size.height,
  );
}

function getFieldRootClassName(compact = false) {
  return compact ? "space-y-1 flex flex-row justify-between" : "space-y-2";
}

function getInputClassName(compact = false, className?: string) {
  return cn(
    compact
      ? "h-8 w-20 bg-transparent px-2 text-[13px] shadow-none"
      : "h-9 w-20 rounded-xl bg-background/60",
    className,
  );
}

function renderFieldLabel(
  label: string,
  htmlFor?: string,
  compact = false,
  icon?: ReactNode,
  title?: string,
) {
  return (
    <Label
      htmlFor={htmlFor}
      title={title}
      data-ai-video-studio-field-description-trigger={
        title ? "true" : undefined
      }
      onClick={title ? () => toast.info(title) : undefined}
      className={cn(
        "inline-flex items-center gap-2 font-medium text-muted-foreground",
        title &&
          "cursor-pointer transition hover:text-foreground active:opacity-80",
        compact ? "text-[13px]" : "text-sm",
      )}
    >
      {icon ? (
        <span
          className={cn(
            "text-muted-foreground",
            compact ? "size-3.5" : "size-4",
          )}
        >
          {icon}
        </span>
      ) : null}
      {label}
    </Label>
  );
}

export default function ImageSizeField({
  field,
  inputId,
  label,
  value,
  disabled,
  compact = false,
  labelIcon,
  labelTitle,
  onChange,
}: ImageSizeFieldProps) {
  const [customMode, setCustomMode] = useState(false);
  const options = getImageSizeOptions(field.schema);
  const sizeValue = getImageSizeValue(value, field.schema);
  const stringValue = getImageSizeStringValue(value, field.schema);
  const matchedStringOption = stringValue
    ? options.find((option) => !option.custom && option.value === stringValue)
    : undefined;
  const matchedOption =
    matchedStringOption ?? findImageSizeOption(options, sizeValue);
  const customOption = options.find((option) => option.custom);
  const isCustom = customMode || !matchedOption;
  const selectedValue =
    isCustom && customOption
      ? customOption.value
      : matchedOption?.value ?? customOption?.value ?? "__custom";
  const showDimensionInputs =
    isCustom ||
    (typeof matchedOption?.width === "number" &&
      typeof matchedOption.height === "number");

  const commitSize = (width: number, height: number) => {
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return;
    }

    onChange({
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    });
  };

  const handleSelectValueChange = (nextValue: string) => {
    const nextOption = options.find((option) => option.value === nextValue);
    if (!nextOption) {
      return;
    }

    if (nextOption.custom) {
      setCustomMode(true);
      commitSize(sizeValue.width, sizeValue.height);
      return;
    }

    if (
      typeof nextOption.width === "number" &&
      typeof nextOption.height === "number"
    ) {
      setCustomMode(false);
      commitSize(nextOption.width, nextOption.height);
      return;
    }

    setCustomMode(false);
    onChange(nextOption.value);
  };

  return (
    <div
      data-ai-video-studio-image-size-field={field.key}
      className={getFieldRootClassName(compact)}
    >
      {renderFieldLabel(label, inputId, compact, labelIcon, labelTitle)}
      <div
        className={cn(
          "flex gap-2",
          compact && "",
        )}
      >
        <Select
          value={selectedValue}
          onValueChange={handleSelectValueChange}
          disabled={disabled}
        >
          <SelectTrigger
            id={inputId}
            aria-label={label}
            data-selected-value={selectedValue}
            className={cn(
              "h-11 min-w-[8rem] rounded-xl border-border/60 bg-background/60 px-3 text-sm font-medium text-foreground",
              compact && "h-8 rounded-lg text-[13px]",
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showDimensionInputs ? (
          <>
            <Input
              aria-label={`${label} width`}
              type="number"
              value={sizeValue.width}
              onChange={(event) =>
                commitSize(Number(event.target.value), sizeValue.height)
              }
              disabled={disabled}
              readOnly={!isCustom}
              min={1}
              step={1}
              className={cn(
                getInputClassName(compact),
                !isCustom && "bg-muted/40 text-muted-foreground",
              )}
            />
            <span className="flex items-center justify-center text-base font-semibold text-muted-foreground">
              x
            </span>
            <Input
              aria-label={`${label} height`}
              type="number"
              value={sizeValue.height}
              onChange={(event) =>
                commitSize(sizeValue.width, Number(event.target.value))
              }
              disabled={disabled}
              readOnly={!isCustom}
              min={1}
              step={1}
              className={cn(
                getInputClassName(compact),
                !isCustom && "bg-muted/40 text-muted-foreground",
              )}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
