"use client";

import ImageWithRolesField from "@/components/ai/fields/ImageWithRolesField";
import PromptField, {
  isPromptFieldDescriptor,
} from "@/components/ai/fields/PromptField";
import ReferenceField, {
  resolveReferenceFieldKind,
  type ReferenceFieldTexts,
} from "@/components/ai/fields/ReferenceField";
import ToolsField from "@/components/ai/fields/ToolsField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { isImageWithRolesFieldDescriptor } from "@/lib/ai-video-studio/image-with-roles";
import { cn } from "@/lib/utils";
import type {
  AiVideoStudioFieldDescriptor,
  AiVideoStudioFieldKind,
} from "@/lib/ai-video-studio/schema";
import type { ReactNode } from "react";

type JsonSchema = Record<string, any>;

type SchemaControlKind = AiVideoStudioFieldKind | "object";

type AIVideoStudioFieldControlProps = {
  field: AiVideoStudioFieldDescriptor;
  label: string;
  value: unknown;
  disabled?: boolean;
  compact?: boolean;
  labelIcon?: ReactNode;
  placeholder?: string;
  referenceFieldTexts?: ReferenceFieldTexts;
  onReferenceMetadataChange?: (
    metadata: {
      videoDurationsByUrl?: Record<string, number>;
      audioDurationsByUrl?: Record<string, number>;
    },
  ) => void;
  onChange: (value: unknown) => void;
};

function getEnumOptions(schema: JsonSchema) {
  return Array.isArray(schema.enum)
    ? schema.enum.filter(
        (item): item is string | number =>
          typeof item === "string" || typeof item === "number",
      )
    : [];
}

function getSchemaControlKind(schema: JsonSchema): SchemaControlKind {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return "enum";
  }

  if (schema.type === "boolean") {
    return "boolean";
  }

  if (schema.type === "number" || schema.type === "integer") {
    return "number";
  }

  if (schema.type === "array") {
    return "array";
  }

  if (schema.type === "object" && schema.properties) {
    return "object";
  }

  return "text";
}

function getOrderedSchemaKeys(schema: JsonSchema) {
  const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
  const ordered = Array.isArray(schema["x-apidog-orders"])
    ? schema["x-apidog-orders"].filter(
        (key: unknown): key is string => typeof key === "string",
      )
    : [];
  const seen = new Set<string>();
  const keys: string[] = [];

  for (const key of ordered) {
    if (!(key in properties) || seen.has(key)) {
      continue;
    }

    seen.add(key);
    keys.push(key);
  }

  for (const key of Object.keys(properties)) {
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    keys.push(key);
  }

  return keys;
}

function getObjectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getArrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function cloneDefaultValue(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    typeof structuredClone === "function"
  ) {
    return structuredClone(value);
  }

  return value;
}

function isMeaningfulDefaultValue(value: unknown) {
  if (value === undefined) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  return true;
}

function getDefaultValueForSchema(schema: JsonSchema): unknown {
  if (schema.default !== undefined) {
    return cloneDefaultValue(schema.default);
  }

  const kind = getSchemaControlKind(schema);

  if (kind === "enum") {
    return getEnumOptions(schema)[0] ?? "";
  }

  if (kind === "array") {
    return [];
  }

  if (kind === "object") {
    const next: Record<string, unknown> = {};

    for (const key of getOrderedSchemaKeys(schema)) {
      const childSchema = schema.properties?.[key] as JsonSchema | undefined;
      if (!childSchema || typeof childSchema !== "object") {
        continue;
      }

      const childDefault = getDefaultValueForSchema(childSchema);
      if (isMeaningfulDefaultValue(childDefault)) {
        next[key] = childDefault;
      }
    }

    return next;
  }

  if (kind === "number" || kind === "text") {
    return "";
  }

  return undefined;
}

function createSyntheticField(
  key: string,
  path: string[],
  schema: JsonSchema,
): AiVideoStudioFieldDescriptor {
  const kind = getSchemaControlKind(schema);

  if (kind === "object") {
    throw new Error(`Object schema cannot be converted into a synthetic field: ${key}`);
  }

  return {
    key,
    path,
    label: key,
    kind,
    required: false,
    schema,
    defaultValue: getDefaultValueForSchema(schema),
  };
}

function isToolsFieldDescriptor(field: AiVideoStudioFieldDescriptor) {
  if (field.kind !== "array") {
    return false;
  }

  const lastPathSegment = field.path.at(-1)?.toLowerCase();
  const typeSchema = field.schema.items?.properties?.type;
  const toolTypes = Array.isArray(typeSchema?.enum)
    ? typeSchema.enum.filter((item: unknown): item is string => typeof item === "string")
    : [];

  return lastPathSegment === "tools" && toolTypes.length === 1 && toolTypes[0] === "web_search";
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
  icon?: ReactNode,
) {
  return (
    <Label
      htmlFor={htmlFor}
      className={cn(
        "inline-flex items-center gap-2 font-medium text-muted-foreground",
        compact ? "text-[13px]" : "text-sm",
      )}
    >
      {icon ? (
        <span className={cn("text-muted-foreground", compact ? "size-3.5" : "size-4")}>
          {icon}
        </span>
      ) : null}
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
      : "h-11 rounded-xl bg-background/60",
    className,
  );
}

function shouldUseSlider(schema: JsonSchema) {
  return (
    typeof schema.minimum === "number" && schema.minimum > -1011 &&
    typeof schema.maximum === "number" && schema.maximum < 101
  );
}

function getSliderValue(
  value: unknown,
  schema: JsonSchema,
) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (typeof schema.default === "number" && Number.isFinite(schema.default)) {
    return schema.default;
  }

  return schema.minimum;
}

function renderObjectSchemaFields(input: {
  schema: JsonSchema;
  path: string[];
  value: unknown;
  disabled?: boolean;
  onChange: (value: unknown) => void;
}) {
  const objectValue = getObjectValue(input.value);

  return getOrderedSchemaKeys(input.schema).map((key) => {
    const childSchema = input.schema.properties?.[key] as JsonSchema | undefined;
    if (!childSchema || typeof childSchema !== "object") {
      return null;
    }

    const childPath = [...input.path, key];
    const childValue = objectValue[key];
    const childKind = getSchemaControlKind(childSchema);

    if (childKind === "object") {
      return (
        <div
          key={childPath.join(".")}
          className="space-y-2 rounded-xl border border-border/50 bg-background/30 p-3"
        >
          <div className="text-[13px] font-medium text-muted-foreground">
            {key}
          </div>
          <div className="space-y-2">
            {renderObjectSchemaFields({
              schema: childSchema,
              path: childPath,
              value: childValue,
              disabled: input.disabled,
              onChange: (nextChildValue) =>
                input.onChange({
                  ...objectValue,
                  [key]: nextChildValue,
                }),
            })}
          </div>
        </div>
      );
    }

    return (
      <AIVideoStudioFieldControl
        key={childPath.join(".")}
        field={createSyntheticField(key, childPath, childSchema)}
        label={key}
        value={childValue}
        disabled={input.disabled}
        compact
        onChange={(nextChildValue) =>
          input.onChange({
            ...objectValue,
            [key]: nextChildValue,
          })
        }
      />
    );
  });
}

export default function AIVideoStudioFieldControl({
  field,
  label,
  value,
  disabled,
  compact = false,
  labelIcon,
  placeholder,
  referenceFieldTexts,
  onReferenceMetadataChange,
  onChange,
}: AIVideoStudioFieldControlProps) {
  const inputId =
    Array.isArray(field.path) && field.path.length > 0
      ? field.path.join("__")
      : field.key;
  const referenceFieldKind = resolveReferenceFieldKind(field);

  if (!compact && field.kind === "text" && isPromptFieldDescriptor(field)) {
    return (
      <PromptField
        field={field}
        inputId={inputId}
        label={label}
        value={value}
        disabled={disabled}
        labelIcon={labelIcon}
        placeholder={placeholder}
        onChange={onChange}
      />
    );
  }

  if (isImageWithRolesFieldDescriptor(field)) {
    return (
      <ImageWithRolesField
        inputId={inputId}
        label={label}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  if (referenceFieldKind) {
    return (
      <ReferenceField
        field={field}
        inputId={inputId}
        label={label}
        value={value}
        disabled={disabled}
        labelIcon={labelIcon}
        texts={referenceFieldTexts}
        onMetadataChange={onReferenceMetadataChange}
        onChange={onChange}
      />
    );
  }

  if (isToolsFieldDescriptor(field)) {
    return (
      <ToolsField
        inputId={inputId}
        label="web_search"
        value={value}
        disabled={disabled}
        compact={compact}
        onChange={onChange}
      />
    );
  }

  if (field.kind === "enum") {
    const options = getEnumOptions(field.schema);
    const selectedValue =
      options.find((option) => String(option) === String(value)) ?? options[0];

    return (
      <div className={getFieldRootClassName(compact)}>
        {renderFieldLabel(label, inputId, compact, labelIcon)}
        <div
          id={inputId}
          className={cn("flex flex-wrap gap-3", compact && "gap-2")}
        >
          {options.map((option) => (
            <button
              key={String(option)}
              type="button"
              aria-pressed={selectedValue === option}
              onClick={() => onChange(option)}
              disabled={disabled}
              className={cn(
                "rounded-2xl border text-center font-semibold transition outline-none",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                compact
                  ? "px-2 py-1 text-[13px]"
                  : "min-w-20 px-3 py-2 text-[15px] shadow-sm",
                selectedValue === option
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/60 bg-background text-foreground/70 hover:border-foreground/20 hover:text-foreground",
              )}
            >
              {String(option)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.kind === "boolean") {
    return (
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3",
          compact ? "gap-3 rounded-none border-0 bg-transparent px-0 py-1" : "rounded-xl border border-border/60 bg-background/40 ",
        )}
      >
        {renderFieldLabel(label, inputId, compact, labelIcon)}
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

  if (field.kind === "array") {
    const itemSchema =
      field.schema.items && typeof field.schema.items === "object"
        ? (field.schema.items as JsonSchema)
        : ({ type: "string" } as JsonSchema);
    const itemKind = getSchemaControlKind(itemSchema);
    const items = getArrayValue(value);
    const maxItems =
      typeof field.schema.maxItems === "number" ? field.schema.maxItems : null;
    const minItems =
      typeof field.schema.minItems === "number" ? field.schema.minItems : 0;

    return (
      <div className="space-y-2">
        {renderFieldLabel(label, inputId, compact, labelIcon)}
        <div
          id={inputId}
          data-ai-video-studio-array-field={field.key}
          className="space-y-3"
        >
          {items.map((item, index) => {
            const itemPath = [...field.path, String(index)];
            const canRemove = !disabled && items.length > minItems;

            return (
              <div
                key={itemPath.join(".")}
                data-ai-video-studio-array-item={String(index)}
                className={cn(
                  "rounded-2xl border border-border/60 bg-background/40 p-3",
                  compact && "rounded-xl p-2.5",
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Item {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(items.filter((_, itemIndex) => itemIndex !== index))
                    }
                    disabled={!canRemove}
                    className="text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>

                {itemKind === "object" ? (
                  <div
                    data-ai-video-studio-array-object={String(index)}
                    className="space-y-2"
                  >
                    {renderObjectSchemaFields({
                      schema: itemSchema,
                      path: itemPath,
                      value: item,
                      disabled,
                      onChange: (nextItemValue) =>
                        onChange(
                          items.map((currentItem, itemIndex) =>
                            itemIndex === index ? nextItemValue : currentItem,
                          ),
                        ),
                    })}
                  </div>
                ) : (
                  <AIVideoStudioFieldControl
                    field={createSyntheticField(
                      `${field.key}_${index}`,
                      itemPath,
                      itemSchema,
                    )}
                    label={`Item ${index + 1}`}
                    value={item}
                    disabled={disabled}
                    compact
                    onChange={(nextItemValue) =>
                      onChange(
                        items.map((currentItem, itemIndex) =>
                          itemIndex === index ? nextItemValue : currentItem,
                        ),
                      )
                    }
                  />
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() =>
              onChange([...items, getDefaultValueForSchema(itemSchema)])
            }
            disabled={Boolean(
              disabled || (maxItems !== null && items.length >= maxItems),
            )}
            className="rounded-xl border border-dashed border-border/60 px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-foreground/30 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            Add Item
          </button>
        </div>
      </div>
    );
  }

  if (field.kind === "number") {
    if (shouldUseSlider(field.schema)) {
      const sliderValue = getSliderValue(value, field.schema);

      return (
        <div className={cn("space-y-2", compact && "min-w-0 flex-1")}>
          <div className="flex items-center justify-between gap-3">
            {renderFieldLabel(label, inputId, compact, labelIcon)}
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {sliderValue}
            </span>
          </div>
          <Slider
            min={field.schema.minimum}
            max={field.schema.maximum}
            step={field.schema.step}
            value={[sliderValue]}
            onValueChange={([nextValue]) => onChange(nextValue)}
            disabled={disabled}
            className="py-4.5"
          />
        </div>
      );
    }

    return (
      <div className={getFieldRootClassName(compact)}>
        {renderFieldLabel(label, inputId, compact, labelIcon)}
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
          placeholder={placeholder}
          className={getInputClassName(compact)}
        />
      </div>
    );
  }

  return (
    <div className={getFieldRootClassName(compact)}>
      {renderFieldLabel(label, inputId, compact, labelIcon)}
      <Input
        id={inputId}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={getInputClassName(compact)}
      />
    </div>
  );
}
