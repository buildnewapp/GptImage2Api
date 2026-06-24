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

type OutputFormatFieldProps = {
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

export function isOutputFormatFieldDescriptor(
  field: AiVideoStudioFieldDescriptor,
) {
  return field.key === "output_format";
}

function getEnumOptions(schema: JsonSchema) {
  return Array.isArray(schema.enum)
    ? schema.enum.filter(
        (item): item is string | number =>
          typeof item === "string" || typeof item === "number",
      )
    : [];
}

function getFieldRootClassName(compact = false) {
  return compact ? "space-y-1 flex flex-row justify-between" : "space-y-2";
}

export default function OutputFormatField({
  field,
  inputId,
  label,
  value,
  disabled,
  compact = false,
  labelIcon,
  labelTitle,
  onChange,
}: OutputFormatFieldProps) {
  const options = getEnumOptions(field.schema);
  const selectedValue =
    options.find((option) => String(option) === String(value)) ?? options[0];
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
      data-ai-video-studio-output-format-field={field.key}
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
            onClick={() => onChange(option)}
            disabled={disabled}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm font-semibold uppercase tracking-wide transition outline-none",
              "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              compact && "rounded-lg px-2 py-1 text-[12px]",
              selectedValue === option
                ? "border-foreground bg-foreground text-background"
                : "border-border/60 bg-background/60 text-foreground/70 hover:border-foreground/20 hover:text-foreground",
            )}
          >
            {String(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
