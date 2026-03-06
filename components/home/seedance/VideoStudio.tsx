"use client";

import {
  calculateCreditsForImplementation,
  getModelFamiliesByMode,
  getVersionsByMode,
  resolveSelection,
  type GenerationMode,
  type ProviderKey,
} from "@/config/model_config";
import { useUserBenefits } from "@/hooks/useUserBenefits";
import { authClient } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils";
import {
  safeParseVideoRemixPayload,
  safeParseVideoStudioFormPayload,
  VIDEO_REMIX_STORAGE_KEY,
  VIDEO_STUDIO_FORM_STORAGE_KEY,
} from "@/lib/video/remix";
import {
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  Play,
  Sparkles,
  Type,
  WandSparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import HeroPromptCarousel from "./HeroPromptCarousel";
import {
  ModelSelector,
  type ModelSelectorItem,
  type ModelSelectorVersionItem,
} from "./ModelSelector";
import {
  buildPayloadForModel,
  getDefaultValuesForModel,
  getProviderMeta,
  ProviderFieldsRenderer,
} from "./providers/ProviderFieldsRenderer";
import type { ProviderFormValues } from "./providers/types";

type GenerationStatus = "generating" | "success" | "failed";

type GenerationTask = {
  localId: string;
  taskId?: string;
  status: GenerationStatus;
  resultVideoUrl?: string;
  mode: GenerationMode;
  prompt: string;
  modelLabel: string;
  modelKey: string;
  versionLabel: string;
  versionKey?: string;
  providerKey: ProviderKey;
  providerValues: ProviderFormValues;
  isPublic: boolean;
  creditsRequired: number;
  progress: number;
  createdAt: number;
};



const VideoStudio = () => {
  const t = useTranslations("Landing.Hero");
  const searchParams = useSearchParams();
  const { data: session } = authClient.useSession();
  const {
    benefits,
    isLoading: isLoadingBenefits,
    mutate: refreshBenefits,
  } = useUserBenefits();

  const [mode, setMode] = useState<GenerationMode>("text-to-video");
  const [selectedModelKey, setSelectedModelKey] = useState("seedance-1.5");
  const [selectedVersionKey, setSelectedVersionKey] = useState<string>();
  const [selectedProviderKey, setSelectedProviderKey] =
    useState<ProviderKey>("office");

  const [providerValues, setProviderValues] = useState<ProviderFormValues>({});

  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasInitializedFromStorageRef = useRef(false);

  const [generationTasks, setGenerationTasks] = useState<GenerationTask[]>([]);
  const [activeTaskLocalId, setActiveTaskLocalId] = useState<string | null>(null);

  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    console.log('version', '2026-02-26 23:34:09')
    if (hasInitializedFromStorageRef.current) return;

    const applyCachedPayload = (
      payload:
        | ReturnType<typeof safeParseVideoStudioFormPayload>
        | ReturnType<typeof safeParseVideoRemixPayload>,
    ) => {
      if (!payload) return;

      if (payload.mode) {
        setMode(payload.mode);
      }
      if (payload.modelKey) {
        setSelectedModelKey(payload.modelKey);
      }
      if (payload.versionKey) {
        setSelectedVersionKey(payload.versionKey);
      }
      if (payload.providerKey) {
        setSelectedProviderKey(payload.providerKey);
      }
      if (payload.providerValues) {
        setProviderValues((prev) => ({
          ...prev,
          ...payload.providerValues,
        }));
      }
      if (typeof payload.isPublic === "boolean") {
        setIsPublic(payload.isPublic);
      }
    };

    const isRemix = searchParams.get("remix") === "1";
    if (isRemix) {
      const remixPayload = safeParseVideoRemixPayload(
        window.localStorage.getItem(VIDEO_REMIX_STORAGE_KEY),
      );
      applyCachedPayload(remixPayload);
      window.localStorage.removeItem(VIDEO_REMIX_STORAGE_KEY);
      if (remixPayload) {
        toast.success(t("form.remixApplied"));
      }
      hasInitializedFromStorageRef.current = true;
      console.log('remix', VIDEO_REMIX_STORAGE_KEY)
      return;
    }

    const payload = safeParseVideoStudioFormPayload(
      window.localStorage.getItem(VIDEO_STUDIO_FORM_STORAGE_KEY),
    );
    applyCachedPayload(payload);
    hasInitializedFromStorageRef.current = true;
  }, [searchParams, t]);

  useEffect(() => {
    if (!hasInitializedFromStorageRef.current) return;

    const payload = {
      mode,
      modelKey: selectedModelKey,
      versionKey: selectedVersionKey,
      providerKey: selectedProviderKey,
      isPublic,
      providerValues,
    };

    try {
      window.localStorage.setItem(VIDEO_STUDIO_FORM_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      if (!providerValues.imageUrl) return;
      try {
        window.localStorage.setItem(
          VIDEO_STUDIO_FORM_STORAGE_KEY,
          JSON.stringify({
            ...payload,
            providerValues: {
              ...providerValues,
              imageUrl: undefined,
            },
          }),
        );
      } catch {
        // ignore storage errors
      }
    }
  }, [
    isPublic,
    mode,
    providerValues,
    selectedModelKey,
    selectedProviderKey,
    selectedVersionKey,
  ]);

  const availableFamilies = useMemo(() => getModelFamiliesByMode(mode), [mode]);

  useEffect(() => {
    if (availableFamilies.length === 0) return;

    if (!availableFamilies.some((item) => item.modelKey === selectedModelKey)) {
      setSelectedModelKey(availableFamilies[0].modelKey);
    }
  }, [availableFamilies, selectedModelKey]);

  const availableVersions = useMemo(
    () => getVersionsByMode(selectedModelKey, mode),
    [selectedModelKey, mode],
  );

  useEffect(() => {
    if (availableVersions.length === 0) {
      setSelectedVersionKey(undefined);
      return;
    }

    if (
      !selectedVersionKey ||
      !availableVersions.some((item) => item.versionKey === selectedVersionKey)
    ) {
      setSelectedVersionKey(availableVersions[0].versionKey);
    }
  }, [availableVersions, selectedVersionKey]);

  const availableProviders = useMemo(() => {
    const version = availableVersions.find(
      (item) => item.versionKey === (selectedVersionKey || availableVersions[0]?.versionKey),
    );
    if (!version) return [] as ProviderKey[];

    return [...new Set(version.implementations.filter((item) => item.mode === mode).map((item) => item.providerKey))];
  }, [availableVersions, mode, selectedVersionKey]);

  useEffect(() => {
    if (availableProviders.length === 0) return;

    if (!availableProviders.includes(selectedProviderKey)) {
      setSelectedProviderKey(availableProviders[0]);
    }
  }, [availableProviders, selectedProviderKey]);

  const resolvedSelection = useMemo(
    () =>
      resolveSelection({
        mode,
        modelKey: selectedModelKey,
        versionKey: selectedVersionKey,
        providerKey: selectedProviderKey,
      }),
    [mode, selectedModelKey, selectedVersionKey, selectedProviderKey],
  );

  const currentModelId = resolvedSelection?.implementation.modelId;

  useEffect(() => {
    if (!currentModelId) return;
    const defaults = getDefaultValuesForModel(currentModelId);
    setProviderValues((prev) => {
      const next: ProviderFormValues = {};
      for (const [key, defaultVal] of Object.entries(defaults)) {
        const prevVal = prev[key as keyof ProviderFormValues];
        (next as Record<string, unknown>)[key] =
          prevVal !== undefined && prevVal !== "" ? prevVal : defaultVal;
      }
      // keep prompt and imageUrl from prev if they exist
      if (prev.prompt) next.prompt = prev.prompt;
      if (prev.imageUrl) next.imageUrl = prev.imageUrl;
      return next;
    });
  }, [currentModelId]);

  const modelOptions = useMemo<ModelSelectorItem[]>(
    () =>
      availableFamilies.map((family) => ({
        id: family.modelKey,
        name: family.displayName,
        description: family.description,
        tags: family.tags,
        selectable: family.selectable,
      })),
    [availableFamilies],
  );
  const modelVersionOptions = useMemo<ModelSelectorVersionItem[]>(
    () =>
      availableVersions.map((version) => ({
        id: version.versionKey,
        name: version.displayName,
      })),
    [availableVersions],
  );

  const inputPayload = useMemo(
    () =>
      currentModelId
        ? buildPayloadForModel(currentModelId, providerValues)
        : {},
    [providerValues, currentModelId],
  );

  const estimatedCredits = useMemo(() => {
    if (!resolvedSelection) return null;
    return calculateCreditsForImplementation(resolvedSelection.implementation, inputPayload);
  }, [resolvedSelection, inputPayload]);

  const availableCredits = benefits?.totalAvailableCredits ?? null;

  const pollingTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const updateGenerationTask = useCallback(
    (localId: string, patch: Partial<GenerationTask>) => {
      setGenerationTasks((prev) =>
        prev.map((task) => (task.localId === localId ? { ...task, ...patch } : task)),
      );
    },
    [],
  );

  const increaseTaskProgress = useCallback((localId: string) => {
    setGenerationTasks((prev) =>
      prev.map((task) =>
        task.localId === localId
          ? { ...task, progress: Math.min(task.progress + 10, 95) }
          : task,
      ),
    );
  }, []);

  const clearTaskPolling = useCallback((localId: string) => {
    const timer = pollingTimersRef.current.get(localId);
    if (!timer) return;
    clearInterval(timer);
    pollingTimersRef.current.delete(localId);
  }, []);

  const getTaskParamsLine = useCallback((task: GenerationTask) => {
    const parts: string[] = [
      task.mode === "image-to-video" ? t("form.imageToVideo") : t("form.textToVideo")
    ];

    if (task.providerValues.resolution) {
      parts.push(`${t("form.resolution")}: ${task.providerValues.resolution}`);
    }
    if (task.providerValues.aspectRatio) {
      parts.push(`${t("form.aspectRatio")}: ${task.providerValues.aspectRatio}`);
    }
    if (task.providerValues.duration) {
      parts.push(`${t("form.duration")}: ${task.providerValues.duration}`);
    }
    if (task.providerValues.seed) {
      parts.push(`${t("form.seed")}: ${task.providerValues.seed}`);
    }
    parts.push(task.isPublic ? t("form.public") : t("form.private"));

    return parts.join(" · ");
  }, [t]);

  const handleCopyPrompt = useCallback(async (promptText: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
      toast.success(t("form.promptCopied"));
    } catch {
      toast.error(t("form.copyFailed"));
    }
  }, [t]);

  const handleDownloadVideo = useCallback((url: string, taskId: string | undefined) => {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = `video-task-${taskId || Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, []);

  const handleRemixTask = useCallback((task: GenerationTask) => {
    setMode(task.mode);
    setSelectedModelKey(task.modelKey);
    setSelectedVersionKey(task.versionKey);
    setSelectedProviderKey(task.providerKey);
    setProviderValues({ ...task.providerValues });
    setIsPublic(task.isPublic);
    setActiveTaskLocalId(task.localId);
    toast.success(t("form.remixApplied"));
  }, [t]);

  const pollStatus = useCallback(
    (localId: string, taskId: string) => {
      clearTaskPolling(localId);

      const timer = setInterval(async () => {
        try {
          const res = await fetch(`/api/video/status?taskId=${taskId}`);
          const data = await res.json();

          if (data.data?.status === "success") {
            clearTaskPolling(localId);
            const resultUrl = data.data?.resultUrls?.[0] || data.data?.resultUrl;
            updateGenerationTask(localId, {
              status: "success",
              resultVideoUrl: resultUrl,
              progress: 100,
            });
            setActiveTaskLocalId(localId);
            toast.success(t("form.generationSuccess"));
          } else if (data.data?.status === "failed") {
            clearTaskPolling(localId);
            updateGenerationTask(localId, {
              status: "failed",
              progress: 100,
            });
            toast.error(data.data?.failMsg || t("form.generationFailed"));
          } else {
            increaseTaskProgress(localId);
          }
        } catch {
          // ignore polling errors
        }
      }, 5000);

      pollingTimersRef.current.set(localId, timer);
    },
    [clearTaskPolling, increaseTaskProgress, t, updateGenerationTask],
  );

  useEffect(() => {
    return () => {
      pollingTimersRef.current.forEach((timer) => clearInterval(timer));
      pollingTimersRef.current.clear();
    };
  }, []);

  const activeTask = useMemo(() => {
    if (generationTasks.length === 0) return null;
    if (!activeTaskLocalId) return generationTasks[0];
    return generationTasks.find((task) => task.localId === activeTaskLocalId) || generationTasks[0];
  }, [activeTaskLocalId, generationTasks]);

  const activeResultVideoUrl = activeTask?.resultVideoUrl || null;

  const providerMetaInfo = currentModelId ? getProviderMeta(currentModelId) : null;
  const requiresImage = providerMetaInfo?.requiresImage ?? mode === "image-to-video";
  const requiresPrompt = providerMetaInfo?.requiresPrompt ?? false;

  const canGenerate =
    !isSubmitting &&
    !!resolvedSelection &&
    estimatedCredits !== null &&
    (!session?.user ||
      availableCredits === null ||
      availableCredits >= estimatedCredits) &&
    (!requiresPrompt ||
      (typeof inputPayload.prompt === "string" &&
        inputPayload.prompt.trim().length > 0)) &&
    (!requiresImage || typeof inputPayload.image_url === "string");

  const handleGenerate = useCallback(async () => {
    if (isSubmitting) return;

    if (!session?.user) {
      toast.error(t("form.loginRequired"));
      return;
    }

    if (!resolvedSelection) {
      toast.error(t("form.unsupportedCombination"));
      return;
    }

    if (estimatedCredits === null) {
      toast.error(t("form.unsupportedCombination"));
      return;
    }

    if (availableCredits !== null && availableCredits < estimatedCredits) {
      toast.error(t("form.insufficientCredits"));
      return;
    }

    const localTaskId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const taskPrompt =
      providerValues.prompt?.trim() ||
      (mode === "image-to-video" ? t("form.imageToVideo") : "-");
    const taskModelLabel = `${resolvedSelection.family.displayName} · ${resolvedSelection.version.displayName}`;

    setGenerationTasks((prev) => [
      {
        localId: localTaskId,
        status: "generating",
        mode,
        prompt: taskPrompt,
        modelLabel: taskModelLabel,
        modelKey: resolvedSelection.family.modelKey,
        versionLabel: resolvedSelection.version.displayName,
        versionKey: resolvedSelection.version.versionKey,
        providerKey: resolvedSelection.implementation.providerKey,
        providerValues: { ...providerValues },
        isPublic,
        creditsRequired: estimatedCredits,
        progress: 5,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setActiveTaskLocalId(localTaskId);
    setIsSubmitting(true);

    try {
      const requestBody = {
        mode,
        providerKey: resolvedSelection.implementation.providerKey,
        modelKey: resolvedSelection.family.modelKey,
        versionKey: resolvedSelection.version.versionKey,
        isPublic,
        input: inputPayload,
      };

      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (data.success && data.data?.taskId) {
        updateGenerationTask(localTaskId, { taskId: data.data.taskId });
        toast.success(t("form.generationSuccess"));
        void refreshBenefits();
        pollStatus(localTaskId, data.data.taskId);
      } else {
        updateGenerationTask(localTaskId, {
          status: "failed",
          progress: 100,
        });
        toast.error(data.message || t("form.generationFailed"));
      }
    } catch {
      updateGenerationTask(localTaskId, {
        status: "failed",
        progress: 100,
      });
      toast.error(t("form.generationFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    session,
    t,
    resolvedSelection,
    estimatedCredits,
    availableCredits,
    mode,
    isPublic,
    inputPayload,
    providerValues,
    pollStatus,
    refreshBenefits,
    updateGenerationTask,
  ]);

  const translateForm = useCallback(
    (key: string, values?: Record<string, string | number>) =>
      t(key as never, values as never),
    [t],
  );

  return (
    <main className="flex-1 flex flex-col items-center container px-4">
      <div className="w-full min-w-0 max-w-7xl mx-auto">
        <div className="flex w-full min-w-0 flex-col lg:flex-row items-start gap-8 my-10 h-full mx-auto p-2 lg:p-6 rounded-xl lg:rounded-3xl border border-border/50 bg-card shadow-xl">
          <div
            className="w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 flex flex-col gap-5 h-fit"
            id="generation-form"
          >
            <div className="flex w-full rounded-xl border border-border/50 bg-white dark:bg-zinc-900 p-1 mb-2">
              <button
                onClick={() => setMode("text-to-video")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all",
                  mode === "text-to-video"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <Type className="w-4 h-4" />
                <span>{t("form.textToVideo")}</span>
              </button>
              <button
                onClick={() => setMode("image-to-video")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all",
                  mode === "image-to-video"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <ImageIcon className="w-4 h-4" />
                <span>{t("form.imageToVideo")}</span>
              </button>
            </div>

            <ModelSelector
              selectedId={selectedModelKey}
              onSelect={setSelectedModelKey}
              models={modelOptions}
              label={t("form.aiModel")}
              placeholder={t("form.selectModel")}
              versions={modelVersionOptions}
              selectedVersionId={selectedVersionKey}
              onSelectVersion={(versionKey) => setSelectedVersionKey(versionKey)}
              versionLabel={t("form.modelVersion")}
            />

            {currentModelId ? (
              <ProviderFieldsRenderer
                modelId={currentModelId}
                mode={mode}
                values={providerValues}
                onChange={(next) => setProviderValues((prev) => ({ ...prev, ...next }))}
                isPublic={isPublic}
                onPublicChange={(next) => setIsPublic(next)}
                t={translateForm}
              />
            ) : (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {t("form.unsupportedCombination")}
              </div>
            )}

            <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{t("form.currentCredits")}</div>
              <div className="text-lg font-semibold text-foreground">
                {!session?.user || isLoadingBenefits
                  ? "--"
                  : t("form.creditsRequired", { count: availableCredits ?? 0 })}
              </div>
            </div>

            <div className="pt-4 mt-auto">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <div className="flex items-center justify-center gap-2 relative z-10">
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 fill-white/20" />
                  )}
                  <span>
                    {isSubmitting
                      ? t("form.generating")
                      : estimatedCredits === null
                        ? t("form.generate")
                        : `${t("form.generate")} (${t("form.creditsRequired", { count: estimatedCredits })})`}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {generationTasks.length > 0 && (
            <div className="flex-1 w-full rounded-xl border border-border/50 bg-muted/10 backdrop-blur-sm overflow-hidden relative flex flex-col shadow-sm">
              <div className="flex-1 min-h-0 h-full bg-muted/30 flex flex-col p-3 gap-3">
                <div className="relative rounded-2xl overflow-hidden bg-black h-[clamp(180px,36vh,420px)] lg:h-[clamp(220px,42vh,520px)] shrink-0">
                  <div className="h-full w-full">
                    {activeTask?.status === "generating" ? (
                      <div className="flex flex-col items-center justify-center h-full w-full gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
                        <p className="text-white/80 text-sm">{t("form.generating")}</p>
                        <p className="text-white/60 text-xs">{activeTask.progress}%</p>
                      </div>
                    ) : activeResultVideoUrl ? (
                      <video
                        key={activeTask?.localId || activeResultVideoUrl}
                        src={activeResultVideoUrl}
                        playsInline
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                      />
                    ) : activeTask?.status === "failed" ? (
                      <div className="flex flex-col items-center justify-center h-full w-full gap-3 text-white/75">
                        <X className="w-8 h-8" />
                        <p className="text-sm">{t("form.generationFailed")}</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 min-h-0 rounded-2xl border border-border/60 bg-background/50 p-3 flex flex-col">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{t("form.tasks")}</h3>
                    <span className="text-xs text-muted-foreground">{generationTasks.length}</span>
                  </div>
                  <div className="mt-3 flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                    {generationTasks.map((task, index) => (
                      <div
                        key={task.localId}
                        onClick={() => setActiveTaskLocalId(task.localId)}
                        className={cn(
                          "w-full text-left rounded-xl border p-3 transition-colors cursor-pointer",
                          activeTask?.localId === task.localId
                            ? "border-blue-500/70 bg-blue-500/10"
                            : "border-border/60 bg-background/60 hover:bg-muted/40",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-36 h-24 rounded-lg overflow-hidden bg-black shrink-0 border border-border/50">
                            {task.resultVideoUrl ? (
                              <video
                                src={task.resultVideoUrl}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVideo(task.resultVideoUrl || null);
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[11px] text-white/70">
                                {task.status === "failed" ? t("form.generationFailed") : t("form.generating")}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                <span>{t("form.task", { index: generationTasks.length - index })}</span>
                                {task.taskId && (
                                  <span
                                    className="font-mono text-[10px] text-muted-foreground bg-background/50 border border-border/50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted transition-colors flex items-center gap-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (task.taskId) {
                                        navigator.clipboard.writeText(task.taskId);
                                        toast.success("Task ID copied");
                                      }
                                    }}
                                    title="Copy Task ID"
                                  >
                                    {task.taskId}
                                    <Copy className="w-2.5 h-2.5" />
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {new Date(task.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground truncate">
                              {task.versionLabel} · {t("form.creditsRequired", { count: task.creditsRequired })} · {getTaskParamsLine(task)}
                            </div>
                            <div className="mt-1 text-xs text-foreground/90 break-words max-h-10 overflow-hidden">
                              {task.prompt}
                            </div>
                            {task.status !== "success" && (
                              <>
                                <div className="mt-2 h-1.5 rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      task.status === "failed" ? "bg-red-500" : "bg-blue-500",
                                    )}
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                                <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
                                  {task.status === "generating" && <Loader2 className="w-3 h-3 animate-spin" />}
                                  <span>
                                    {task.status === "generating"
                                      ? `${t("form.generating")} ${task.progress}%`
                                      : t("form.generationFailed")}
                                  </span>
                                </div>
                              </>
                            )}

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (task.resultVideoUrl) {
                                    setSelectedVideo(task.resultVideoUrl);
                                  }
                                }}
                                disabled={!task.resultVideoUrl}
                                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] disabled:opacity-50"
                              >
                                <Play className="w-3 h-3" />
                                {t("form.openVideo")}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (task.resultVideoUrl) {
                                    handleDownloadVideo(task.resultVideoUrl, task.taskId);
                                  }
                                }}
                                disabled={!task.resultVideoUrl}
                                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] disabled:opacity-50"
                              >
                                <Download className="w-3 h-3" />
                                {t("form.downloadVideo")}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleCopyPrompt(task.prompt);
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px]"
                              >
                                <Copy className="w-3 h-3" />
                                {t("form.copyPrompt")}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemixTask(task);
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px]"
                              >
                                <WandSparkles className="w-3 h-3" />
                                {t("form.remix")}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {generationTasks.length == 0 && (
            <div className="w-full min-w-0 overflow-hidden">
              <HeroPromptCarousel onPlayVideo={setSelectedVideo} />
            </div>
          )}
        </div>
      </div>

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

            <div className="absolute inset-0 -z-10" onClick={() => setSelectedVideo(null)} />
          </div>,
          document.body,
        )}
    </main>
  );
};

export default VideoStudio;
