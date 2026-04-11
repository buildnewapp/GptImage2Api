"use client";

import AIVideoStudioFieldControl from "@/components/ai/AIVideoStudioFieldControl";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";

type AIVideoStudioFieldsProps = {
  fields: AiVideoStudioFieldDescriptor[];
  values: Record<string, unknown>;
  isPublic: boolean;
  disabled?: boolean;
  onChange: (path: string[], value: unknown) => void;
  onPublicChange: (next: boolean) => void;
};

function getValueAtPath(
  source: Record<string, unknown>,
  path: string[],
) {
  let current: unknown = source;

  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export default function AIVideoStudioFields({
  fields,
  values,
  isPublic,
  disabled,
  onChange,
  onPublicChange,
}: AIVideoStudioFieldsProps) {
  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <AIVideoStudioFieldControl
          key={field.path.join(".")}
          field={field}
          label={field.path.join(".")}
          value={getValueAtPath(values, field.path)}
          disabled={disabled}
          onChange={(nextValue) => onChange(field.path, nextValue)}
        />
      ))}

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3">
        <Label
          htmlFor="ai-video-studio-is-public"
          className="text-sm font-medium text-muted-foreground"
        >
          public
        </Label>
        <Switch
          id="ai-video-studio-is-public"
          checked={isPublic}
          onCheckedChange={onPublicChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
