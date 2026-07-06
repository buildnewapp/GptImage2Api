"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type NegativePromptFieldProps = {
  field: AiVideoStudioFieldDescriptor;
  inputId: string;
  label: string;
  value: unknown;
  disabled?: boolean;
  compact?: boolean;
  labelIcon?: ReactNode;
  labelTitle?: string;
  placeholder?: string;
  onChange: (value: unknown) => void;
};

export function isNegativePromptFieldDescriptor(
  field: AiVideoStudioFieldDescriptor,
) {
  return field.key === "negative_prompt";
}

function resolveTextMaxLength(schema: JsonSchema) {
  if (typeof schema.maxLength === "number" && Number.isFinite(schema.maxLength)) {
    return schema.maxLength;
  }

  const description = typeof schema.description === "string" ? schema.description : "";
  const matched = description.match(/max length:\s*(\d+)/i);
  if (matched) {
    const parsed = Number(matched[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 1000;
}

function getFieldRootClassName(compact = false) {
  return compact ? "space-y-1 flex flex-row justify-between" : "space-y-2";
}

export default function NegativePromptField({
  field,
  inputId,
  label,
  value,
  disabled,
  compact = false,
  labelIcon,
  labelTitle,
  placeholder,
  onChange,
}: NegativePromptFieldProps) {
  const textValue = typeof value === "string" ? value : "";
  const maxLength = resolveTextMaxLength(field.schema);
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
      data-ai-video-studio-negative-prompt-field={field.key}
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
      <div className="relative">
        <Textarea
          id={inputId}
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder}
          className={cn(
            "rounded-xl bg-background/60 pr-20 pb-10 text-sm leading-relaxed",
            compact ? "min-h-10" : "h-16",
          )}
        />
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-full border border-border/60 bg-background/85 px-2 py-1 text-xs font-medium text-muted-foreground">
          {textValue.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
