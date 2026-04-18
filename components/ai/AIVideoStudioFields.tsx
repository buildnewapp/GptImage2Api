"use client";

import {
  resolveReferenceFieldKind,
  type ReferenceFieldTexts,
} from "@/components/ai/fields/ReferenceField";
import { useState } from "react";

import AIVideoStudioFieldControl from "@/components/ai/AIVideoStudioFieldControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";
import {
  AudioLines,
  ChevronDown,
  Clock3,
  Crop,
  FileText,
  Images,
  Link2,
  Monitor,
  Sparkles,
  SlidersHorizontal,
  Video,
  Globe,
} from "lucide-react";
import {cn} from "@/lib/utils";

type AIVideoStudioFieldsProps = {
  primaryFields: AiVideoStudioFieldDescriptor[];
  advancedFields: AiVideoStudioFieldDescriptor[];
  values: Record<string, unknown>;
  isPublic: boolean;
  disabled?: boolean;
  advancedLabel?: string;
  localizedFieldLabels?: Partial<Record<AiVideoStudioSpecialFieldKey, string>>;
  promptPlaceholder?: string;
  publicVisibilityLabel?: string;
  publicToggleLabel?: string;
  referenceFieldTexts?: ReferenceFieldTexts;
  showPublicInAdvanced?: boolean;
  onChange: (path: string[], value: unknown) => void;
  onReferenceMetadataChange?: (
    path: string[],
    metadata: {
      videoDurationsByUrl?: Record<string, number>;
      audioDurationsByUrl?: Record<string, number>;
    },
  ) => void;
  onPublicChange: (next: boolean) => void;
};

type AiVideoStudioSpecialFieldKey =
  | "prompt"
  | "size"
  | "resolution"
  | "aspectRatio"
  | "duration"
  | "seed"
  | "firstFrameImage"
  | "lastFrameImage"
  | "referenceAudios"
  | "referenceImages"
  | "referenceVideos"
  | "referenceUrls";

type JsonSchema = Record<string, any>;

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

function normalizeFieldToken(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isAspectRatioLikeOption(option: unknown) {
  if (typeof option !== "string") {
    return false;
  }

  const normalized = option.trim().toLowerCase();
  return (
    /^\d+:\d+$/.test(normalized) ||
    normalized === "adaptive" ||
    normalized === "auto" ||
    normalized === "portrait" ||
    normalized === "landscape"
  );
}

function resolveSizeFieldMeaning(schema: JsonSchema) {
  const description = typeof schema.description === "string"
    ? schema.description.toLowerCase()
    : "";
  const enumOptions = Array.isArray(schema.enum) ? schema.enum : [];

  if (
    description.includes("aspect ratio") ||
    description.includes("ratio of the generated") ||
    (enumOptions.length > 0 && enumOptions.every(isAspectRatioLikeOption))
  ) {
    return "aspectRatio";
  }

  return "size";
}

function resolveSpecialFieldKey(
  field: AiVideoStudioFieldDescriptor,
): AiVideoStudioSpecialFieldKey | null {
  for (const segment of [...field.path].reverse()) {
    const token = normalizeFieldToken(segment);

    if (token === "firstframeurl") {
      return "firstFrameImage";
    }

    if (token === "lastframeurl") {
      return "lastFrameImage";
    }
  }

  const referenceFieldKind = resolveReferenceFieldKind(field);

  if (referenceFieldKind === "image") {
    return "referenceImages";
  }

  if (referenceFieldKind === "video") {
    return "referenceVideos";
  }

  if (referenceFieldKind === "audio") {
    return "referenceAudios";
  }

  if (referenceFieldKind === "url") {
    return "referenceUrls";
  }

  for (const segment of [...field.path].reverse()) {
    const token = normalizeFieldToken(segment);

    if (token === "prompt") {
      return "prompt";
    }

    if (
      token === "resolution" ||
      token === "imageresolution" ||
      token === "videoresolution"
    ) {
      return "resolution";
    }

    if (
      token === "size" ||
      token === "imagesize" ||
      token === "videosize" ||
      token === "quality"
    ) {
      return resolveSizeFieldMeaning(field.schema);
    }

    if (token === "aspectratio" || token === "ratio") {
      return "aspectRatio";
    }

    if (
      token === "duration" ||
      token === "nframes" ||
      token === "frames"
    ) {
      return "duration";
    }

    if (token === "seed") {
      return "seed";
    }
  }

  return null;
}

function renderSpecialFieldIcon(
  key: AiVideoStudioSpecialFieldKey | null,
) {
  if (key === "prompt") {
    return <FileText className="size-4" />;
  }

  if (key === "resolution") {
    return <Monitor className="size-4" />;
  }

  if (key === "referenceImages") {
    return <Images className="size-4" />;
  }

  if (key === "firstFrameImage" || key === "lastFrameImage") {
    return <Images className="size-4" />;
  }

  if (key === "referenceVideos") {
    return <Video className="size-4" />;
  }

  if (key === "referenceAudios") {
    return <AudioLines className="size-4" />;
  }

  if (key === "referenceUrls") {
    return <Link2 className="size-4" />;
  }

  if (key === "size") {
    return <SlidersHorizontal className="size-4" />;
  }

  if (key === "aspectRatio") {
    return <Crop className="size-4" />;
  }

  if (key === "duration") {
    return <Clock3 className="size-4" />;
  }

  if (key === "seed") {
    return <Sparkles className="size-4" />;
  }

  return <SlidersHorizontal className="size-4" />;
}

function createRandomSeed() {
  return Math.floor(Math.random() * 2147483647);
}

export default function AIVideoStudioFields({
  primaryFields,
  advancedFields,
  values,
  isPublic,
  disabled,
  advancedLabel = "Advanced",
  localizedFieldLabels,
  promptPlaceholder,
  publicVisibilityLabel = "Public Visibility",
  publicToggleLabel = "Public",
  referenceFieldTexts,
  showPublicInAdvanced = false,
  onChange,
  onReferenceMetadataChange,
  onPublicChange,
}: AIVideoStudioFieldsProps) {
  const shouldRenderAdvancedSection =
    advancedFields.length > 0 || showPublicInAdvanced;
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  function renderSeedField(field: AiVideoStudioFieldDescriptor, label: string) {
    const inputId = field.path.join("__");
    const value = getValueAtPath(values, field.path);

    return (
      <div
        key={field.path.join(".")}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
          <Sparkles className="size-4 shrink-0" />
          <Label
            htmlFor={inputId}
            className="text-sm font-medium text-muted-foreground"
          >
            {label}
          </Label>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Input
            id={inputId}
            type="number"
            value={typeof value === "number" || typeof value === "string" ? value : ""}
            onChange={(event) => {
              const nextValue = event.target.value;
              onChange(field.path, nextValue === "" ? "" : Number(nextValue));
            }}
            disabled={disabled}
            min={field.schema.minimum}
            max={field.schema.maximum}
            step={field.schema.step}
            placeholder="Random (-1)"
            className="h-8 w-36 rounded-lg border-border/60 bg-background/80 px-4 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            onClick={() => onChange(field.path, createRandomSeed())}
            className="size-8 rounded-lg border-border/60 bg-background/80"
            aria-label={`${label} random`}
            title={`${label} random`}
          >
            <Sparkles className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  function renderField(
    field: AiVideoStudioFieldDescriptor,
    options?: { compact?: boolean },
  ) {
    const specialFieldKey = resolveSpecialFieldKey(field);
    const label =
      (specialFieldKey
        ? localizedFieldLabels?.[specialFieldKey]
        : undefined) ??
      (specialFieldKey === "seed"
        ? "Seed"
        : specialFieldKey === "firstFrameImage"
          ? "First Frame"
          : specialFieldKey === "lastFrameImage"
            ? "Last Frame"
            : field.path.join("."));
    const isPromptField = specialFieldKey === "prompt";
    const compact = options?.compact ?? false;

    if (specialFieldKey === "seed") {
      return renderSeedField(field, label);
    }

    return (
      <AIVideoStudioFieldControl
        key={field.path.join(".")}
        field={field}
        label={label}
        compact={compact}
        labelIcon={renderSpecialFieldIcon(specialFieldKey)}
        placeholder={isPromptField ? promptPlaceholder : undefined}
        referenceFieldTexts={referenceFieldTexts}
        value={getValueAtPath(values, field.path)}
        disabled={disabled}
        onReferenceMetadataChange={(metadata) =>
          onReferenceMetadataChange?.(field.path, metadata)
        }
        onChange={(nextValue) => onChange(field.path, nextValue)}
      />
    );
  }

  function renderPublicVisibility(region: "default" | "advanced") {
    return (
      <div
        data-ai-video-studio-public
        data-ai-video-studio-public-region={region}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
          <Globe className="size-5 shrink-0" />
          <Label
            htmlFor="ai-video-studio-is-public"
            className="text-sm text-muted-foreground"
          >
            {publicVisibilityLabel}
          </Label>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {publicToggleLabel}
          </span>
          <Switch
            id="ai-video-studio-is-public"
            checked={isPublic}
            onCheckedChange={onPublicChange}
            disabled={disabled}
            className="scale-90"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {primaryFields.map((field) => renderField(field))}

      {shouldRenderAdvancedSection ? (
        <div
          data-state={isAdvancedOpen ? "open" : "closed"}
          data-ai-video-studio-advanced
          className="rounded-xl border border-border/60 bg-background/30 px-4"
        >
          <button
            type="button"
            id={showPublicInAdvanced ? "ai-video-studio-advanced-public" : undefined}
            aria-expanded={isAdvancedOpen}
            data-state={isAdvancedOpen ? "open" : "closed"}
            data-slot="collapsible-trigger"
            onClick={() => setIsAdvancedOpen((previous) => !previous)}
            className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <span>{advancedLabel}</span>
            <ChevronDown
              className={isAdvancedOpen ? "size-4 rotate-180 transition-transform" : "size-4 transition-transform"}
            />
          </button>
          {isAdvancedOpen ? (
            <div
              data-state="open"
              data-slot="collapsible-content"
              className="space-y-3 pb-4"
            >
              {advancedFields.map((field) =>
                renderField(field, { compact: true }),
              )}
              {showPublicInAdvanced ? renderPublicVisibility("advanced") : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {showPublicInAdvanced ? null : renderPublicVisibility("default")}
    </div>
  );
}
