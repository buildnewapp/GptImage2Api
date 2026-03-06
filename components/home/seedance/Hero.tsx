"use client";

import { type PromptCase, promptCategories } from "@/components/prompts/promptsData";
import { VIDEO_MODEL_CREDITS } from "@/config/video-generation";
import { authClient } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Image as ImageIcon,
  Loader2,
  Monitor,
  Sparkles,
  Type,
  Upload,
  Video,
  WandSparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import HeroPromptCard from "./HeroPromptCard";
import { ModelSelector } from "./ModelSelector";

type GenerationMode = "image-to-video" | "text-to-video";
type GenerationStatus = "idle" | "generating" | "success" | "failed";

const ASPECT_RATIOS = ["auto", "16:9", "9:16", "4:3", "3:4"];
const RESOLUTIONS = ["480p", "720p"];

const Hero = () => {
  const t = useTranslations("Landing.Hero");
  const tPrompts = useTranslations("Prompts");
  const { data: session } = authClient.useSession();

  // Form state
  const [mode, setMode] = useState<GenerationMode>("image-to-video");
  const [selectedModel, setSelectedModel] = useState("seedance-1.5-pro");
  const [prompt, setPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [resolution, setResolution] = useState("480p");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("auto");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // New state for advanced settings
  const [seed, setSeed] = useState("");
  const [fixCamera, setFixCamera] = useState(false);
  const [useUrl, setUseUrl] = useState(false);
  const [addEndFrame, setAddEndFrame] = useState(false);
  const [soraVersion, setSoraVersion] = useState("sora-2");

  // Generation state
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  // Preview carousel
  const [previewIndex, setPreviewIndex] = useState(0);
  const [randomCases, setRandomCases] = useState<{ promptCase: PromptCase; categoryId: string; index: number }[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  // Swipe handlers
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setPreviewIndex((i) => (i + 1) % randomCases.length);
    } else if (isRightSwipe) {
      setPreviewIndex((i) => (i - 1 + randomCases.length) % randomCases.length);
    }
  };

  useEffect(() => {
    const allCases: { promptCase: PromptCase; categoryId: string; index: number }[] = [];
    promptCategories.forEach((cat) => {
      cat.cases.forEach((c, i) => {
        allCases.push({ promptCase: c, categoryId: cat.id, index: i });
      });
    });
    // Shuffle
    for (let i = allCases.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCases[i], allCases[j]] = [allCases[j], allCases[i]];
    }
    setRandomCases(allCases.slice(0, 5));
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Image upload handler
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const removeImage = useCallback(() => {
    setUploadedImage(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Poll for generation status
  const pollStatus = useCallback(
    (id: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/video/status?taskId=${id}`);
          const data = await res.json();
          if (data.data?.status === "success") {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setStatus("success");
            // Try to extract video URL from result
            const resultUrl = data.data?.resultUrl;
            if (resultUrl) {
              setResultVideoUrl(resultUrl);
            }
            toast.success(t("form.generationSuccess"));
          } else if (data.data?.status === "failed") {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setStatus("failed");
            toast.error(t("form.generationFailed"));
          }
        } catch {
          // ignore polling errors
        }
      }, 5000);
    },
    [t]
  );

  // Generate video
  const handleGenerate = useCallback(async () => {
    if (!session?.user) {
      toast.error(t("form.loginRequired"));
      return;
    }

    setStatus("generating");
    setResultVideoUrl(null);

    try {
      const input: Record<string, any> = {
        prompt: prompt || undefined,
        resolution,
        duration: `${duration}s`,
        aspect_ratio: aspectRatio === "auto" ? undefined : aspectRatio,
        seed: seed ? parseInt(seed) : -1,
      };

      if (mode === "image-to-video" && uploadedImage) {
        input.image_url = uploadedImage;
      }

      const requestBody = {
        model: selectedModel === "sora-2" ? soraVersion : selectedModel,
        input,
      };

      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (data.success && data.data?.taskId) {
        setTaskId(data.data.taskId);
        toast.success(t("form.generationSuccess"));
        pollStatus(data.data.taskId);
      } else {
        setStatus("failed");
        toast.error(data.message || t("form.generationFailed"));
      }
    } catch {
      setStatus("failed");
      toast.error(t("form.generationFailed"));
    }
  }, [
    session,
    t,
    selectedModel,
    prompt,
    resolution,
    duration,
    aspectRatio,
    mode,
    uploadedImage,
    seed,
    pollStatus,
  ]);

  const credits =
    VIDEO_MODEL_CREDITS[
    selectedModel as keyof typeof VIDEO_MODEL_CREDITS
    ] || 10;

  const canGenerate =
    status !== "generating" &&
    (mode === "text-to-video" ? prompt.trim().length > 0 : true);

  return (
    <main className="flex-1 flex flex-col items-center w-full">
      <div className="container">
        {/*
        <section className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-4 sm:space-y-6 md:space-y-8">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                {t("title")}
              </h1>
              <p className="text-sm sm:text-lg text-gray-700 dark:text-gray-300 max-w-5xl mx-auto leading-relaxed">
                {t("description")}
              </p>
            </div>
          </div>
        </section>
        */}

        <div className="flex flex-col lg:flex-row items-start gap-8 my-10 h-full mx-auto p-6 rounded-3xl border border-border/50 bg-card shadow-xl max-w-[90rem]">
          {/* Left: Input Form */}
          <div
            className="w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 flex flex-col gap-5 h-fit"
            id="generation-form"
          >
            {/* Mode Tabs */}
            <div className="flex w-full rounded-xl border border-border/50 bg-white dark:bg-zinc-900 p-1 mb-2">
              <button
                onClick={() => setMode("image-to-video")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all",
                  mode === "image-to-video"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <ImageIcon className="w-4 h-4" />
                <span>{t("form.imageToVideo")}</span>
              </button>
              <button
                onClick={() => setMode("text-to-video")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all",
                  mode === "text-to-video"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Type className="w-4 h-4" />
                <span>{t("form.textToVideo")}</span>
              </button>
            </div>

            {/* AI Model Selector */}
            <ModelSelector
              selectedId={selectedModel}
              onSelect={setSelectedModel}
            />

            {/* Sora Model Version & Disclaimer */}
            {selectedModel === "sora-2" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {t("form.modelVersion")}
                  </label>
                  <div className="flex w-full rounded-xl border border-border/50 bg-background/50 p-1 gap-2">
                    <button
                      onClick={() => setSoraVersion("sora-2")}
                      className={cn(
                        "flex-1 flex flex-col items-start justify-center py-1 px-2 rounded-lg text-sm transition-all border text-left",
                        soraVersion === "sora-2"
                          ? "bg-zinc-200/50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 shadow-sm"
                          : "border-transparent hover:bg-muted/50"
                      )}
                    >
                      <span className="font-bold text-foreground">{t("form.sora2.name")}</span>
                      <span className="text-[10px] text-muted-foreground font-medium mt-0.5  line-clamp-1">{t("form.sora2.description")}</span>
                    </button>
                    <button
                      onClick={() => setSoraVersion("sora-2-pro")}
                      className={cn(
                        "flex-1 flex flex-col items-start justify-center py-1 px-2 rounded-lg text-sm transition-all border text-left",
                        soraVersion === "sora-2-pro"
                          ? "bg-zinc-200/50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 shadow-sm"
                          : "border-transparent hover:bg-muted/50"
                      )}
                    >
                      <span className="font-bold text-foreground">{t("form.sora2pro.name")}</span>
                      <span className="text-[10px] text-muted-foreground font-medium mt-0.5 line-clamp-1">{t("form.sora2pro.description")}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Image Upload Area (only in image-to-video mode) */}
            {mode === "image-to-video" && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    {t("form.images")}
                  </span>
                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{t("form.addEndFrame")}</span>
                      <div
                        className={cn("w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-200", addEndFrame ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700")}
                        onClick={() => setAddEndFrame(!addEndFrame)}
                      >
                        <div className={cn("w-4 h-4 rounded-full shadow-sm bg-white dark:bg-black transition-transform duration-200", addEndFrame ? "translate-x-4" : "translate-x-0")} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{t("form.useUrl")}</span>
                      <div
                        className={cn("w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-200", useUrl ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700")}
                        onClick={() => setUseUrl(!useUrl)}
                      >
                        <div className={cn("w-4 h-4 rounded-full shadow-sm bg-white dark:bg-black transition-transform duration-200", useUrl ? "translate-x-4" : "translate-x-0")} />
                      </div>
                    </div>

                    <span className="text-sm text-muted-foreground ml-1">
                      {uploadedImage ? "1/1" : "0/1"}
                    </span>
                  </div>
                </div>
                {uploadedImage ? (
                  <div className="relative rounded-xl border border-border/50 overflow-hidden group">
                    <Image
                      src={uploadedImage}
                      alt="Uploaded"
                      width={400}
                      height={200}
                      className="w-full h-40 object-cover transition-transform group-hover:scale-105"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                  </div>
                ) : (
                  <div
                    className="relative border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ease-in-out h-40 flex flex-col items-center justify-center border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      accept="image/*,.png,.jpg,.jpeg,.webp"
                      className="sr-only"
                      type="file"
                      onChange={handleImageUpload}
                    />
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-3 group-hover:scale-110 transition-transform duration-300">
                      <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      {t("form.uploadTitle")}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase font-medium">
                      {t("form.uploadFormats")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Prompt Input */}
            <div className="space-y-2 flex-1 flex flex-col">
              <label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t("form.prompt")}
              </label>
              <div className="relative flex-1 group">
                <textarea
                  className="flex border placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm w-full h-full resize-none rounded-xl bg-background/50 backdrop-blur-sm border-border/50 p-4 text-base focus:border-primary/50 focus:ring-primary/20 transition-all shadow-sm min-h-[120px]"
                  id="prompt"
                  placeholder={t("form.promptPlaceholder")}
                  maxLength={5000}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <div className="absolute bottom-3 right-3 text-[10px] font-medium text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border/50 shadow-sm">
                  <span>
                    {prompt.length}/5000
                  </span>
                </div>
              </div>
            </div>

            {/* Settings: Resolution */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                {t("form.resolution")}
              </label>
              <div className="flex flex-wrap gap-2">
                {RESOLUTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setResolution(r)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-sm font-medium transition-all border shadow-sm",
                      resolution === r
                        ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                        : "bg-background border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t("form.duration")}
              </label>
              <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                <input
                  type="range"
                  min={5}
                  max={40}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-sm font-mono font-semibold w-8 text-right text-foreground">
                  {duration}s
                </span>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Video className="w-4 h-4" />
                {t("form.aspectRatio")}
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={cn(
                      "flex flex-col items-center justify-center aspect-square rounded-xl border-2 transition-all p-1 gap-2",
                      aspectRatio === ratio
                        ? "border-primary/50 bg-primary/5 text-primary shadow-sm"
                        : "border-transparent bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    )}
                    title={ratio}
                  >
                    {ratio === "auto" ? (
                      <WandSparkles className="w-5 h-5" />
                    ) : (
                      <div
                        className={cn(
                          "rounded-[2px] border border-current opacity-80",
                          ratio === "16:9" && "w-8 h-[18px]",
                          ratio === "9:16" && "w-[18px] h-8",
                          ratio === "4:3" && "w-7 h-[21px]",
                          ratio === "3:4" && "w-[21px] h-7"
                        )}
                      />
                    )}
                    <span className="text-[10px] font-medium leading-none opacity-80">
                      {ratio === "auto" ? t("form.auto") : ratio}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors w-full"
              >
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    showAdvanced ? "rotate-180" : "-rotate-90"
                  )}
                />
                {t("form.advanced")}
              </button>

              <div className={cn(
                "grid transition-all duration-300 ease-in-out gap-4 overflow-hidden",
                showAdvanced ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 mt-0"
              )}>
                <div className="min-h-0 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{t("form.seed")}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t("form.randomSeed")}
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-border/50 bg-background/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary/20"
                      />
                      <button
                        title="Reload Seed"
                        onClick={() => setSeed(Math.floor(Math.random() * 1000000).toString())}
                        className="p-2 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">{t("form.fixCamera")}</span>
                      <span className="text-muted-foreground/50 cursor-help" title="Fixes the camera position">ⓘ</span>
                    </div>
                    <div
                      className={cn("w-10 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200", fixCamera ? "bg-zinc-900 dark:bg-white" : "bg-zinc-200 dark:bg-zinc-700")}
                      onClick={() => setFixCamera(!fixCamera)}
                    >
                      <div className={cn("w-4 h-4 rounded-full shadow-sm bg-white dark:bg-black transition-transform duration-200", fixCamera ? "translate-x-4" : "translate-x-0")} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="pt-4 mt-auto">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <div className="flex items-center justify-center gap-2 relative z-10">
                  {status === "generating" ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t("form.generating")}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 fill-white/20" />
                      <span>{t("form.generate")}</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Right: Preview Area */}
          <div className="flex-1 w-full lg:w-auto h-[600px] lg:h-[850px] rounded-3xl border border-border/50 bg-muted/10 backdrop-blur-sm overflow-hidden relative flex flex-col shadow-2xl">
            <div className="flex-1 h-full bg-muted/30 flex flex-col items-center justify-center text-center p-2">
              <div className="w-full h-full">
                <div className="flex flex-col h-full w-full object-cover rounded-2xl overflow-hidden opacity-80 hover:opacity-100 transition-opacity duration-500">
                  <div className="flex-1 flex flex-col">
                    <div className="relative group flex-1">
                      <div
                        className={cn(
                          "relative rounded-xl overflow-hidden h-full w-full",
                          status === "generating" || resultVideoUrl ? "bg-black aspect-video" : ""
                        )}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                      >
                        {status === "generating" ? (
                          <div className="flex flex-col items-center justify-center h-full w-full gap-4">
                            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                            <p className="text-white/80 text-sm">
                              {t("form.generating")}
                            </p>
                          </div>
                        ) : resultVideoUrl ? (
                          <video
                            src={resultVideoUrl}
                            playsInline
                            controls
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          randomCases.length > 0 && (
                            <HeroPromptCard
                              promptCase={randomCases[previewIndex].promptCase}
                              index={randomCases[previewIndex].index}
                              categoryId={randomCases[previewIndex].categoryId}
                              onPlayVideo={setSelectedVideo}
                              t={tPrompts}
                            />
                          )
                        )}
                        {!resultVideoUrl && status !== "generating" && randomCases.length > 0 && (
                          <>
                            <button
                              onClick={() =>
                                setPreviewIndex(
                                  (i) =>
                                    (i - 1 + randomCases.length) %
                                    randomCases.length
                                )
                              }
                              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-10"
                              aria-label="Previous video"
                            >
                              <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                              onClick={() =>
                                setPreviewIndex(
                                  (i) => (i + 1) % randomCases.length
                                )
                              }
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-10"
                              aria-label="Next video"
                            >
                              <ChevronRight className="w-6 h-6" />
                            </button>
                          </>
                        )}
                      </div>
                      {!resultVideoUrl && status !== "generating" && (
                        <div className="flex justify-center gap-2 mt-4">
                          {randomCases.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setPreviewIndex(i)}
                              className={cn(
                                "h-2 rounded-full transition-all duration-200",
                                previewIndex === i
                                  ? "bg-blue-600 w-6"
                                  : "bg-slate-600 hover:bg-slate-500 w-2"
                              )}
                              aria-label={`Go to video ${i + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Video Modal */}
      {selectedVideo &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors z-10"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
              <video
                src={selectedVideo || undefined}
                className="w-full h-full object-contain"
                controls
                autoPlay
                playsInline
              />
            </div>

            <div
              className="absolute inset-0 -z-10"
              onClick={() => setSelectedVideo(null)}
            />
          </div>,
          document.body
        )}
    </main>
  );
};

export default Hero;
