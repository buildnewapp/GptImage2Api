"use client";

import AIVideoStudioFieldControl from "@/components/ai/AIVideoStudioFieldControl";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { partitionAiVideoStudioFields } from "@/lib/ai-video-studio/fields";
import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";
import { ChevronDown, Globe, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type AIVideoStudioFieldsProps = {
  fields: AiVideoStudioFieldDescriptor[];
  values: Record<string, unknown>;
  isPublic: boolean;
  disabled?: boolean;
  advancedLabel: string;
  publicLabel: string;
  useUrlLabel: string;
  promptPlaceholder?: string;
  onChange: (patch: Record<string, unknown>) => void;
  onPublicChange: (next: boolean) => void;
  resolveLabel: (field: AiVideoStudioFieldDescriptor) => string;
};

export default function AIVideoStudioFields({
  fields,
  values,
  isPublic,
  disabled,
  advancedLabel,
  publicLabel,
  useUrlLabel,
  promptPlaceholder,
  onChange,
  onPublicChange,
  resolveLabel,
}: AIVideoStudioFieldsProps) {
  const { primary, advanced } = partitionAiVideoStudioFields(fields);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="space-y-3">
      {primary.map((field) => (
        <AIVideoStudioFieldControl
          key={field.key}
          field={field}
          label={resolveLabel(field)}
          value={values[field.key]}
          disabled={disabled}
          useUrlLabel={useUrlLabel}
          promptPlaceholder={promptPlaceholder}
          onChange={(nextValue) => onChange({ [field.key]: nextValue })}
        />
      ))}

      <Collapsible
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        className="rounded-xl border border-border/60 bg-background/30"
      >
        <CollapsibleTrigger
          className="flex w-full items-center justify-between px-3 py-2.5 text-[13px] font-semibold text-foreground"
          disabled={disabled}
        >
          <span className="flex items-center gap-2 py-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{advancedLabel}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              advancedOpen && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2.5 px-3 pb-3">
          {advanced.map((field) => (
            <AIVideoStudioFieldControl
              key={field.key}
              field={field}
              label={resolveLabel(field)}
              value={values[field.key]}
              disabled={disabled}
              compact
              useUrlLabel={useUrlLabel}
              promptPlaceholder={promptPlaceholder}
              onChange={(nextValue) => onChange({ [field.key]: nextValue })}
            />
          ))}
          <div className="flex items-center justify-between gap-3 bg-transparent px-0 py-1">
            <Label
              htmlFor="ai-video-studio-is-public"
              className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{publicLabel}</span>
            </Label>
            <Switch
              id="ai-video-studio-is-public"
              checked={isPublic}
              onCheckedChange={onPublicChange}
              disabled={disabled}
              className="scale-90"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
