"use client";

import { AiVideoStudioFamilyIcon } from "@/components/ai/AiVideoStudioFamilyIcon";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import {Check, ChevronDown, Sparkles, Video} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type {
  AiVideoStudioFamilyIconKey,
  AiVideoStudioLevelLimit,
} from "@/config/ai-video-studio";
import Image from "next/image";

export type ModelSelectorItem = {
  id: string;
  name: string;
  description: string;
  icon?: AiVideoStudioFamilyIconKey;
  tags?: { text: string; type: string }[];
  selectable?: boolean;
};

export type ModelSelectorVersionItem = {
  id: string;
  name: string;
  levelLimit?: AiVideoStudioLevelLimit;
};

type ModelSelectorProps = {
  selectedId: string;
  onSelect: (id: string) => void;
  models: ModelSelectorItem[];
  label: string;
  placeholder: string;
  versions?: ModelSelectorVersionItem[];
  selectedVersionId?: string;
  onSelectVersion?: (id: string) => void;
  versionLabel?: string;
  labelAccessory?: ReactNode;
};

export function ModelSelector({
  selectedId,
  onSelect,
  models,
  label,
  placeholder,
  versions,
  selectedVersionId,
  onSelectVersion,
  versionLabel,
  labelAccessory,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeVersionId = selectedVersionId || versions?.[0]?.id;
  const useVersionDropdown = (versions?.length ?? 0) >= 3;

  const selectedModel = useMemo(
    () => models.find((item) => item.id === selectedId) || models[0],
    [models, selectedId],
  );
  const activeVersion = useMemo(
    () => versions?.find((item) => item.id === activeVersionId),
    [activeVersionId, versions],
  );
  const activeVersionLevelLimit = activeVersion?.levelLimit;

  if (!selectedModel) return null;

  return (
    <div className="space-y-2 relative">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {label}
        </label>
        {labelAccessory}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between whitespace-nowrap border text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 w-full h-auto min-h-14 py-2 bg-background/50 backdrop-blur-sm border-border/50 focus:ring-primary/20 rounded-xl px-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <ModelIcon model={selectedModel} />
            <div className="flex flex-col items-start gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5 w-full">
                <span className="font-semibold text-foreground truncate">
                  {selectedModel.name}
                </span>
                {selectedModel.tags?.map((tag, i) => (
                  <Badge key={i} type={tag.type} text={tag.text} />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground leading-none truncate w-full text-left">
                {selectedModel.description}
              </span>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 opacity-50 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute top-full left-0 right-0 mt-2 z-50 bg-white backdrop-blur-md rounded-2xl border border-border/50 shadow-xl overflow-hidden max-h-[400px] flex flex-col"
              >
                <div className="overflow-y-auto p-2 scrollbar-hide">
                  {models.map((model) => (
                    <ModelOption
                      key={model.id}
                      model={model}
                      isSelected={selectedId === model.id}
                      onClick={() => {
                        onSelect(model.id);
                        setIsOpen(false);
                      }}
                    />
                  ))}
                </div>

                <div className="p-2 border-t border-border/50 bg-muted/20">
                  <div className="text-[10px] text-center text-muted-foreground">
                    {placeholder}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {versions && versions.length > 1 && onSelectVersion && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {versionLabel || "Version"}
          </label>
          {useVersionDropdown ? (
            <Select value={activeVersionId} onValueChange={onSelectVersion}>
              <SelectTrigger className="w-full !h-11 rounded-xl border-border/50 bg-background/50">
                <SelectValue placeholder={versionLabel || "Version"}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-semibold">
                      {activeVersion?.name}
                    </span>
                    {activeVersionLevelLimit &&
                    activeVersionLevelLimit !== "none" ? (
                      <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                        {activeVersionLevelLimit}
                      </span>
                    ) : null}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    <span className="flex items-center gap-2">
                      <span>{version.name}</span>
                      {version.levelLimit && version.levelLimit !== "none" ? (
                        <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                          {version.levelLimit}
                        </span>
                      ) : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex w-full min-w-0 rounded-xl border border-border/50 bg-background/50 p-1 gap-2">
              {versions.map((version) => (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => onSelectVersion(version.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-lg border px-3 py-2 text-center text-sm transition-all",
                    activeVersionId === version.id
                      ? "bg-zinc-200/50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 shadow-sm"
                      : "border-transparent hover:bg-muted/50",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="font-semibold text-foreground text-xs sm:text-sm truncate">
                      {version.name}
                    </span>
                    {version.levelLimit && version.levelLimit !== "none" ? (
                      <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
                        {version.levelLimit}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ModelIcon = ({ model }: { model: ModelSelectorItem }) => {
  if (model.icon) {
    return (
      <div className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center">
        <AiVideoStudioFamilyIcon icon={model.icon} size={28} />
      </div>
    );
  }

  return (
      <div className="relative w-7 h-7 shrink-0 rounded-lg overflow-hidden">
        <Image src="/logo.png" alt={model.name} fill className="object-contain" />
      </div>
  );
};

const Badge = ({
  text,
  type,
}: {
  text: string;
  type: string;
}) => {
  const styles: Record<string, string> = {
    audio: "bg-gray-200 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300",
    "coming-soon": "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    "error": "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    "hot": "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  };

  const currentStyle = styles[type] || "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400";

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium shrink-0 gap-1",
        currentStyle,
      )}
    >
      {type === "audio" && <Video className="w-2.5 h-2.5" />}
      {text}
    </span>
  );
};

const ModelOption = ({
  model,
  isSelected,
  onClick,
}: {
  model: ModelSelectorItem;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const disabled = model.selectable === false;

  return (
    <button
      onClick={() => {
        if (!disabled) onClick();
      }}
      disabled={disabled}
      className={cn(
        "flex items-center w-full p-2 gap-3 rounded-xl transition-all duration-200 group text-left hover:cursor-pointer",
        isSelected ? "bg-muted shadow-sm" : "hover:bg-muted/90",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <ModelIcon model={model} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-semibold truncate",
              isSelected ? "text-foreground" : "text-foreground/80",
            )}
          >
            {model.name}
          </span>
          {model.tags?.map((tag, i) => (
            <Badge key={i} type={tag.type} text={tag.text} />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground truncate leading-relaxed line-clamp-1">
          {model.description}
        </span>
      </div>
      {isSelected && <Check className="w-4 h-4 text-primary ml-2 shrink-0" />}
    </button>
  );
};
