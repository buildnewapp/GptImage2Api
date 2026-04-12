"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";
import type { ReactNode } from "react";

type PromptFieldProps = {
  field: AiVideoStudioFieldDescriptor;
  inputId: string;
  label: string;
  value: unknown;
  disabled?: boolean;
  labelIcon?: ReactNode;
  placeholder?: string;
  onChange: (value: unknown) => void;
};

function normalizeFieldToken(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function isPromptFieldDescriptor(field: AiVideoStudioFieldDescriptor) {
  return field.path.some((segment) => normalizeFieldToken(segment) === "prompt");
}

function resolvePromptMaxLength(field: AiVideoStudioFieldDescriptor) {
  if (typeof field.schema.maxLength === "number" && Number.isFinite(field.schema.maxLength)) {
    return field.schema.maxLength;
  }

  const description =
    typeof field.schema.description === "string" ? field.schema.description : "";
  const matched = description.match(/max length:\s*(\d+)/i);

  if (matched) {
    const parsed = Number(matched[1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 1000;
}

export default function PromptField({
  field,
  inputId,
  label,
  value,
  disabled,
  labelIcon,
  placeholder,
  onChange,
}: PromptFieldProps) {
  const textValue = typeof value === "string" ? value : "";
  const maxLength = resolvePromptMaxLength(field);

  return (
    <div data-ai-video-studio-prompt-field className="space-y-2">
      <Label
        htmlFor={inputId}
        className="inline-flex items-center gap-2 font-medium text-muted-foreground text-sm"
      >
        {labelIcon ? (
          <span className="size-4 text-muted-foreground">{labelIcon}</span>
        ) : null}
        {label}
      </Label>
      <div className="relative">
        <Textarea
          id={inputId}
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder}
          className={cn(
            "rounded-xl bg-background/60",
            "h-[120px] pr-20 pb-10 text-base leading-relaxed",
          )}
        />
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-full border border-border/60 bg-background/85 px-2 py-1 text-xs font-medium text-muted-foreground">
          {textValue.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}
