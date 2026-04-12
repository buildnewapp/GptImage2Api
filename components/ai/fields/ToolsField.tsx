"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

type ToolsFieldProps = {
  inputId: string;
  label: string;
  value: unknown;
  disabled?: boolean;
  compact?: boolean;
  onChange: (value: unknown) => void;
};

function hasWebSearchTool(value: unknown) {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.some(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as { type?: unknown }).type === "web_search",
  );
}

export default function ToolsField({
  inputId,
  label,
  value,
  disabled,
  compact = false,
  onChange,
}: ToolsFieldProps) {
  const checked = hasWebSearchTool(value);

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl border border-border/60 bg-background/40",
        compact ? "px-3 py-2.5" : "px-4 py-3",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
        <Search className={cn("shrink-0", compact ? "size-4" : "size-4")} />
        <Label
          htmlFor={inputId}
          className={cn(
            "font-medium text-muted-foreground",
            compact ? "text-[13px]" : "text-sm",
          )}
        >
          {label}
        </Label>
      </div>
      <Switch
        id={inputId}
        checked={checked}
        onCheckedChange={(nextChecked) =>
          onChange(nextChecked ? [{ type: "web_search" }] : [])
        }
        disabled={disabled}
      />
    </div>
  );
}
