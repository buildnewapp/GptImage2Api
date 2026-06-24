"use client";

import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { toast } from "sonner";

type JsonSchema = Record<string, any>;

type NumImagesFieldProps = {
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

export function isNumImagesFieldDescriptor(
  field: AiVideoStudioFieldDescriptor,
) {
  return field.key === "num_images";
}

function getEnumOptions(schema: JsonSchema) {
  return Array.isArray(schema.enum)
    ? schema.enum.filter(
        (item): item is string | number =>
          typeof item === "string" || typeof item === "number",
      )
    : [];
}

function resolveNumericLimits(schema: JsonSchema) {
  const enumNumbers = getEnumOptions(schema)
    .map((option) => Number(option))
    .filter((option) => Number.isFinite(option));
  const minimum =
    typeof schema.minimum === "number" && Number.isFinite(schema.minimum)
      ? schema.minimum
      : enumNumbers.length > 0
        ? Math.min(...enumNumbers)
        : 1;
  const maximum =
    typeof schema.maximum === "number" && Number.isFinite(schema.maximum)
      ? schema.maximum
      : enumNumbers.length > 0
        ? Math.max(...enumNumbers)
        : undefined;
  const step =
    typeof schema.multipleOf === "number" && schema.multipleOf > 0
      ? schema.multipleOf
      : typeof schema.step === "number" && schema.step > 0
        ? schema.step
        : 1;

  return {
    minimum,
    maximum,
    step,
  };
}

function getNumericValue(value: unknown, schema: JsonSchema) {
  const candidate =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : typeof schema.default === "number"
          ? schema.default
          : typeof schema.default === "string" && schema.default.trim() !== ""
            ? Number(schema.default)
            : 1;

  return Number.isFinite(candidate) ? candidate : 1;
}

function shouldReturnNumberAsString(schema: JsonSchema) {
  const enumOptions = getEnumOptions(schema);
  return (
    schema.type === "string" ||
    (enumOptions.length > 0 && enumOptions.every((option) => typeof option === "string"))
  );
}

function getFieldRootClassName(compact = false) {
  return compact ? "space-y-1 flex flex-row justify-between" : "space-y-2";
}

function getNumImageOptions(schema: JsonSchema) {
  const enumNumbers = getEnumOptions(schema)
    .map((option) => Number(option))
    .filter((option) => Number.isFinite(option));

  if (enumNumbers.length > 0) {
    return [...new Set(enumNumbers)].sort((a, b) => a - b);
  }

  const { minimum, maximum, step } = resolveNumericLimits(schema);
  if (typeof maximum !== "number" || maximum < minimum) {
    return [minimum];
  }

  const options: number[] = [];
  for (
    let option = minimum;
    option <= maximum && options.length < 100;
    option += step
  ) {
    options.push(schema.type === "integer" ? Math.round(option) : option);
  }

  return [...new Set(options)];
}

export default function NumImagesField({
  field,
  inputId,
  label,
  value,
  disabled,
  compact = false,
  labelIcon,
  labelTitle,
  onChange,
}: NumImagesFieldProps) {
  const options = getNumImageOptions(field.schema);
  const currentValue = getNumericValue(value, field.schema);
  const isInteger = field.schema.type === "integer";
  const selectedValue =
    options.find((option) => String(option) === String(value)) ??
    options.find((option) => option === currentValue) ??
    options[0];
  const formatValue = (nextValue: number) => {
    const normalized = isInteger ? Math.round(nextValue) : nextValue;
    return shouldReturnNumberAsString(field.schema) ? String(normalized) : normalized;
  };
  const labelElement = (
    <Label
      htmlFor={inputId}
      data-ai-video-studio-field-description-trigger={labelTitle ? "true" : undefined}
      onClick={
        labelTitle
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              toast.info(labelTitle, { position: "bottom-center" });
            }
          : undefined
      }
      className={cn(
        "inline-flex items-center gap-2 font-medium text-muted-foreground",
        labelTitle && "cursor-pointer transition hover:text-foreground active:opacity-80",
        compact ? "text-[13px]" : "text-sm",
      )}
    >
      {labelIcon ? (
        <span className={cn("text-muted-foreground", compact ? "size-3.5" : "size-4")}>
          {labelIcon}
        </span>
      ) : null}
      {label}
    </Label>
  );

  return (
    <div
      data-ai-video-studio-num-images-field={field.key}
      data-current-value={String(selectedValue)}
      className={getFieldRootClassName(compact)}
    >
      {labelTitle ? (
        <Tooltip>
          <TooltipTrigger asChild>{labelElement}</TooltipTrigger>
          <TooltipContent side="right" align="center" className="max-w-xs text-left">
            {labelTitle}
          </TooltipContent>
        </Tooltip>
      ) : (
        labelElement
      )}
      <div id={inputId} className={cn("flex flex-wrap gap-2", compact && "gap-1.5")}>
        {options.map((option) => (
          <button
            key={String(option)}
            type="button"
            aria-pressed={selectedValue === option}
            onClick={() => onChange(formatValue(option))}
            disabled={disabled}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm font-semibold tabular-nums transition outline-none",
              "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              compact && "rounded-lg px-2 py-1 text-[12px]",
              selectedValue === option
                ? "border-foreground bg-foreground text-background"
                : "border-border/60 bg-background/60 text-foreground/70 hover:border-foreground/20 hover:text-foreground",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
