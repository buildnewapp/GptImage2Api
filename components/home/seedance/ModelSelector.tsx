"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Aperture, Check, ChevronDown, Command, Sparkles, Video, Zap } from "lucide-react";
import Image from "next/image";
import React, { useState } from "react";

// Define the model type
type Model = {
  id: string;
  name: string;
  description: string;
  tags?: { text: string; type: "audio" | "coming-soon" }[];
  iconType: "image" | "component";
  iconSrc?: string; // For image
  iconComponent?: React.ReactNode; // For component
  iconBg?: string; // Background color for the icon container
};

// Mock data based on the reference image
const models: Model[] = [
  {
    id: "seedance-1.5-pro",
    name: "Seedance 1.5 Pro",
    description: "Joint audio-video with multilingual lip-sync",
    tags: [{ text: "With Audio", type: "audio" }],
    iconType: "image",
    iconSrc: "/icons/seedance2.png",
  },
  {
    id: "seedance-2.0",
    name: "Seedance 2.0",
    description: "Multimodal input with powerful reference capabilities",
    tags: [{ text: "Coming Soon", type: "coming-soon" }],
    iconType: "component",
    iconComponent: <Sparkles className="w-4 h-4 text-purple-500" />, // Fallback/Variant
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
  },
  {
    id: "seedance-1.0",
    name: "Seedance 1.0",
    description: "Advanced model with smooth, stable motion",
    iconType: "component",
    iconComponent: <Zap className="w-4 h-4 text-cyan-500" />,
    iconBg: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  {
    id: "veo-3.1",
    name: "Veo 3.1",
    description: "Google's latest video model with native audio",
    tags: [{ text: "With Audio", type: "audio" }],
    iconType: "component",
    iconComponent: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
    iconBg: "bg-white",
  },
  {
    id: "sora-2",
    name: "Sora 2",
    description: "OpenAI model with realistic physics",
    tags: [{ text: "With Audio", type: "audio" }],
    iconType: "component",
    iconComponent: <div className="w-full h-full bg-black rounded-full flex items-center justify-center text-white text-[10px] font-bold">S</div>,
    iconBg: "bg-transparent",
  },
  {
    id: "grok-imagine",
    name: "Grok Imagine",
    description: "xAI's multimodal model with 10s 720p video and native audio",
    tags: [{ text: "With Audio", type: "audio" }],
    iconType: "component",
    iconComponent: <div className="w-full h-full bg-black rounded flex items-center justify-center text-white font-mono font-bold text-xs">X</div>,
    iconBg: "bg-transparent",
  },
  {
    id: "wan-2.6",
    name: "Wan 2.6",
    description: "Character reference & multi-shot up to 15s",
    tags: [{ text: "With Audio", type: "audio" }],
    iconType: "component",
    iconComponent: <Aperture className="w-4 h-4 text-indigo-600" />,
    iconBg: "bg-indigo-100",
  },
  {
    id: "kling-2.6",
    name: "Kling 2.6",
    description: "Cinematic videos with synced sound and visuals",
    tags: [{ text: "With Audio", type: "audio" }],
    iconType: "component",
    iconComponent: <Command className="w-4 h-4 text-orange-600" />,
    iconBg: "bg-orange-100",
  },
  {
    id: "hailuo-2.3",
    name: "Hailuo 2.3",
    description: "Superior motion control & artistic stylization",
    iconType: "component",
    iconComponent: <div className="w-4 h-4 rounded-full border-2 border-red-500"></div>,
    iconBg: "bg-red-50",
  },
  {
    id: "pixverse-v5",
    name: "Pixverse V5",
    description: "Smooth animations with camera control",
    iconType: "component",
    iconComponent: <Video className="w-4 h-4 text-pink-500" />,
    iconBg: "bg-pink-100",
  },
];

export const ModelSelector = ({
  selectedId: externalSelectedId,
  onSelect: externalOnSelect,
}: {
  selectedId?: string;
  onSelect?: (id: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSelectedId, setInternalSelectedId] = useState("seedance-1.5-pro");

  const selectedId = externalSelectedId ?? internalSelectedId;
  const handleSelect = (id: string) => {
    if (externalOnSelect) externalOnSelect(id);
    else setInternalSelectedId(id);
  };

  const selectedModel = models.find((m) => m.id === selectedId) || models[0];

  return (
    <div className="space-y-2 relative">
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        AI Model
      </label>

      {/* Trigger Button */}
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
                <span className="font-semibold text-foreground truncate">{selectedModel.name}</span>
                {selectedModel.tags?.map((tag, i) => (
                  <Badge key={i} type={tag.type} text={tag.text} />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground leading-none truncate w-full text-left">
                {selectedModel.description}
              </span>
            </div>
          </div>
          <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backrop to close */}
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute top-full left-0 right-0 mt-2 z-50 bg-background/95 backdrop-blur-md rounded-2xl border border-border/50 shadow-xl overflow-hidden max-h-[400px] flex flex-col"
              >
                <div className="overflow-y-auto p-2 scrollbar-hide">
                  {models.map((model) => (
                    <ModelOption
                      key={model.id}
                      model={model}
                      isSelected={selectedId === model.id}
                      onClick={() => {
                        handleSelect(model.id);
                        setIsOpen(false);
                      }}
                    />
                  ))}
                </div>

                <div className="p-2 border-t border-border/50 bg-muted/20">
                  <div className="text-[10px] text-center text-muted-foreground">
                    Select a model to start generating
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Sub-components

const ModelIcon = ({ model }: { model: Model }) => {
  if (model.iconType === "image" && model.iconSrc) {
    return (
      <div className="relative w-7 h-7 shrink-0 rounded-lg overflow-hidden">
        <Image src={model.iconSrc} alt={model.name} fill className="object-contain" />
      </div>
    );
  }
  return (
    <div className={cn("w-7 h-7 shrink-0 rounded-lg flex items-center justify-center", model.iconBg || "bg-muted")}>
      {model.iconComponent}
    </div>
  );
};

const Badge = ({ text, type }: { text: string; type: "audio" | "coming-soon" }) => {
  const styles = {
    audio: "bg-gray-200 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300",
    "coming-soon": "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
  };

  // Custom audio icon check
  const showAudioIcon = type === "audio";

  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium shrink-0 gap-1", styles[type])}>
      {showAudioIcon && <Video className="w-2.5 h-2.5" />}
      {text}
    </span>
  );
};

const ModelOption = ({ model, isSelected, onClick }: { model: Model; isSelected: boolean; onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center w-full p-2 gap-3 rounded-xl transition-all duration-200 group text-left",
        isSelected ? "bg-muted shadow-sm" : "hover:bg-muted/50"
      )}
    >
      <ModelIcon model={model} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-semibold truncate", isSelected ? "text-foreground" : "text-foreground/80")}>
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
  )
}
