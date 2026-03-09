"use client";

import AIVideoStudioFieldControl from "@/components/ai/AIVideoStudioFieldControl";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { partitionAiVideoStudioFields } from "@/lib/ai-video-studio/fields";
import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";
import { SlidersHorizontal } from "lucide-react";

type AIVideoStudioFieldsProps = {
  fields: AiVideoStudioFieldDescriptor[];
  values: Record<string, unknown>;
  isPublic: boolean;
  disabled?: boolean;
  onChange: (patch: Record<string, unknown>) => void;
  onPublicChange: (next: boolean) => void;
  resolveLabel: (field: AiVideoStudioFieldDescriptor) => string;
};

export default function AIVideoStudioFields({
  fields,
  values,
  isPublic,
  disabled,
  onChange,
  onPublicChange,
  resolveLabel,
}: AIVideoStudioFieldsProps) {
  const { primary, advanced } = partitionAiVideoStudioFields(fields);

  return (
    <div className="space-y-5">
      {primary.map((field) => (
        <AIVideoStudioFieldControl
          key={field.key}
          field={field}
          label={resolveLabel(field)}
          value={values[field.key]}
          disabled={disabled}
          onChange={(nextValue) => onChange({ [field.key]: nextValue })}
        />
      ))}

      {advanced.length > 0 ? (
        <div className="space-y-4 rounded-2xl border border-border/60 bg-background/30 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            <span>Advanced settings</span>
          </div>
          <div className="space-y-4">
            {advanced.map((field) => (
              <AIVideoStudioFieldControl
                key={field.key}
                field={field}
                label={resolveLabel(field)}
                value={values[field.key]}
                disabled={disabled}
                onChange={(nextValue) => onChange({ [field.key]: nextValue })}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3">
        <div className="space-y-1">
          <Label htmlFor="ai-video-studio-is-public">Public</Label>
          <p className="text-xs text-muted-foreground">
            Keep the same visibility toggle behavior as the previous studio.
          </p>
        </div>
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
