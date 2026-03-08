"use client";

import type {
  AiStudioCategory,
} from "@/lib/ai-studio/catalog";
import type {
  AiStudioPublicCatalogEntry,
  AiStudioPublicDocDetail,
  AiStudioPublicPricingRow,
} from "@/lib/ai-studio/public";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUserBenefits } from "@/hooks/useUserBenefits";
import {
  applyPricingRowToPayload,
  collectRuntimeModels,
} from "@/lib/ai-studio/runtime";
import { cn } from "@/lib/utils";
import {
  AudioLines,
  Bot,
  Film,
  ImageIcon,
  LoaderCircle,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from "react";

type CatalogResponse = {
  success: boolean;
  data: {
    categories: Record<AiStudioCategory, AiStudioPublicCatalogEntry[]>;
    total: number;
  };
  error?: string;
};

type DetailResponse = {
  success: boolean;
  data: AiStudioPublicDocDetail;
  error?: string;
};

type ExecuteResponse = {
  success: boolean;
  data: {
    generationId?: string | null;
    reservedCredits?: number;
    state?: string;
    taskId?: string | null;
    statusSupported: boolean;
    raw: unknown;
    mediaUrls: string[];
    selectedPricing?: AiStudioPublicPricingRow | null;
    pricingRows: AiStudioPublicPricingRow[];
  };
  error?: string;
};

type TaskResponse = {
  success: boolean;
  data: {
    generationId?: string | null;
    state: string;
    mediaUrls: string[];
    raw: unknown;
    reservedCredits?: number;
    refundedCredits?: number;
  };
  error?: string;
};

type HistoryResponse = {
  success: boolean;
  data: {
    items: Array<{
      id: string;
      catalogModelId: string;
      category: string;
      title: string;
      provider: string;
      status: string;
      providerTaskId: string | null;
      reservedCredits: number;
      capturedCredits: number;
      refundedCredits: number;
      resultUrls: string[];
      createdAt: string;
      completedAt: string | null;
      failedAt: string | null;
      statusReason: string | null;
      raw: unknown;
    }>;
  };
  error?: string;
};

type FieldDescriptor = {
  key: string;
  path: string[];
  label: string;
  schema: Record<string, any>;
  value: any;
  depth: number;
};

const CATEGORY_META: Record<
  AiStudioCategory,
  {
    label: string;
    icon: typeof Film;
    blurb: string;
    accent: string;
  }
> = {
  video: {
    label: "Video",
    icon: Film,
    blurb: "Cinematic motion, avatars, upscales, and multi-shot generation.",
    accent: "from-orange-500/20 via-rose-500/10 to-transparent",
  },
  image: {
    label: "Image",
    icon: ImageIcon,
    blurb: "Creation, editing, upscaling, reframe, and background workflows.",
    accent: "from-emerald-500/20 via-teal-500/10 to-transparent",
  },
  music: {
    label: "Music",
    icon: AudioLines,
    blurb: "Songs, lyrics, MIDI, stems, covers, WAV, and music video tasks.",
    accent: "from-cyan-500/20 via-sky-500/10 to-transparent",
  },
  chat: {
    label: "Chat",
    icon: Bot,
    blurb: "Multi-provider chat models with multimodal and reasoning options.",
    accent: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
  },
};

function getValueAtPath(source: Record<string, any>, path: string[]) {
  return path.reduce<any>((current, segment) => current?.[segment], source);
}

function setValueAtPath(
  source: Record<string, any>,
  path: string[],
  value: unknown,
) {
  const next = structuredClone(source);
  let cursor: Record<string, any> = next;

  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index]!;
    if (!cursor[segment] || typeof cursor[segment] !== "object") {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }

  cursor[path[path.length - 1]!] = value;
  return next;
}

function titleCase(input: string) {
  return input
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function collectFields(
  schema: Record<string, any> | null,
  payload: Record<string, any>,
  path: string[] = [],
  depth = 0,
): FieldDescriptor[] {
  if (!schema || typeof schema !== "object") {
    return [];
  }

  const properties = schema.properties as Record<string, Record<string, any>> | undefined;
  if (!properties) {
    return [];
  }

  const fields: FieldDescriptor[] = [];

  for (const [key, childSchema] of Object.entries(properties)) {
    if (key.toLowerCase().includes("callback")) {
      continue;
    }

    const nextPath = [...path, key];
    const value = getValueAtPath(payload, nextPath);
    const type = childSchema.type;
    const hasObjectChildren = type === "object" && childSchema.properties;

    if (hasObjectChildren) {
      fields.push(
        ...collectFields(childSchema, payload, nextPath, depth + 1),
      );
      continue;
    }

    fields.push({
      key,
      path: nextPath,
      label: titleCase(nextPath.join(" / ")),
      schema: childSchema,
      value,
      depth,
    });
  }

  return fields;
}

function matchesPayloadField(field: FieldDescriptor, type: "image" | "audio" | "video") {
  const name = field.path.join(".").toLowerCase();
  if (type === "image") {
    return name.includes("image");
  }
  if (type === "audio") {
    return name.includes("audio") || name.includes("voice") || name.includes("song");
  }
  return name.includes("video");
}

function guessSelectedPricing(
  pricingRows: AiStudioPublicPricingRow[],
  payload: Record<string, any>,
) {
  if (pricingRows.length <= 1) {
    return pricingRows[0] ?? null;
  }

  const payloadText = JSON.stringify(payload).toLowerCase();
  const payloadModel =
    typeof payload.model === "string" ? payload.model.toLowerCase() : "";
  let bestRow: AiStudioPublicPricingRow | null = null;
  let bestScore = -1;

  for (const row of pricingRows) {
    let score = 0;
    if (payloadModel && row.runtimeModel) {
      if (row.runtimeModel.toLowerCase() === payloadModel) {
        score += 20;
      } else if (row.runtimeModel.toLowerCase().startsWith(`${payloadModel}-`)) {
        score += 10;
      } else {
        score -= 5;
      }
    }

    const tokens = row.modelDescription
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 2);
    for (const token of tokens) {
      if (payloadText.includes(token)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestRow = row;
    }
  }

  return bestRow;
}

function looksLikeImage(url: string) {
  return /\.(png|jpg|jpeg|webp|gif|avif)(\?|$)/i.test(url);
}

function looksLikeVideo(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function looksLikeAudio(url: string) {
  return /\.(mp3|wav|flac|aac|m4a|ogg)(\?|$)/i.test(url);
}

function extractChatText(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return "";
  }

  const record = raw as Record<string, any>;
  return (
    record.choices?.[0]?.message?.content ||
    record.data?.choices?.[0]?.message?.content ||
    record.message ||
    ""
  );
}

export default function AiStudioShell({
  initialCategory = "video",
}: {
  initialCategory?: AiStudioCategory;
}) {
  const {
    benefits,
    optimisticDeduct,
    mutate: refreshBenefits,
  } = useUserBenefits();
  const [catalog, setCatalog] = useState<Record<AiStudioCategory, AiStudioPublicCatalogEntry[]>>({
    video: [],
    image: [],
    music: [],
    chat: [],
  });
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<AiStudioCategory>(initialCategory);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AiStudioPublicDocDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payload, setPayload] = useState<Record<string, any>>({});
  const [runLoading, setRunLoading] = useState(false);
  const [executeResult, setExecuteResult] = useState<ExecuteResponse["data"] | null>(null);
  const [taskState, setTaskState] = useState<string | null>(null);
  const [taskRaw, setTaskRaw] = useState<unknown>(null);
  const [historyItems, setHistoryItems] = useState<HistoryResponse["data"]["items"]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  async function refreshHistory() {
    try {
      const response = await fetch("/api/ai-studio/history?limit=12");
      const json = (await response.json()) as HistoryResponse;
      if (response.ok && json.success) {
        setHistoryItems(json.data.items);
      }
    } catch {
      // Ignore background refresh failures in the debug UI.
    }
  }

  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      setHistoryLoading(true);
      try {
        await refreshHistory();
      } catch {
        if (mounted) {
          setHistoryItems([]);
        }
      } finally {
        if (mounted) {
          setHistoryLoading(false);
        }
      }
    }

    loadHistory();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const response = await fetch("/api/ai-studio/catalog");
        const json = (await response.json()) as CatalogResponse;
        if (!response.ok || !json.success) {
          throw new Error(json.error || "Failed to load catalog");
        }
        if (!mounted) {
          return;
        }
        setCatalog({
          video: json.data.categories.video ?? [],
          image: json.data.categories.image ?? [],
          music: json.data.categories.music ?? [],
          chat: json.data.categories.chat ?? [],
        });
      } catch (error: any) {
        if (!mounted) {
          return;
        }
        setCatalogError(error?.message || "Failed to load catalog");
      } finally {
        if (mounted) {
          setCatalogLoading(false);
        }
      }
    }

    loadCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredEntries = (() => {
    const source = catalog[activeCategory] ?? [];
    if (!deferredSearch.trim()) {
      return source;
    }
    const query = deferredSearch.toLowerCase();
    return source.filter((entry) =>
        `${entry.title} ${entry.provider} ${entry.pricingRows.map((row) => row.modelDescription).join(" ")}`
          .toLowerCase()
          .includes(query),
    );
  })();

  useEffect(() => {
    if (!selectedId && filteredEntries[0]) {
      setSelectedId(filteredEntries[0].id);
      return;
    }

    if (selectedId && !filteredEntries.some((entry) => entry.id === selectedId)) {
      setSelectedId(filteredEntries[0]?.id ?? null);
    }
  }, [filteredEntries, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setPayload({});
      return;
    }

    let mounted = true;

    async function loadDetail() {
      setDetailLoading(true);
      setExecuteResult(null);
      setTaskState(null);
      setTaskRaw(null);
      try {
        const response = await fetch(`/api/ai-studio/models/${selectedId}`);
        const json = (await response.json()) as DetailResponse;
        if (!response.ok || !json.success) {
          throw new Error(json.error || "Failed to load model detail");
        }
        if (!mounted) {
          return;
        }
        setDetail(json.data);
        setPayload(json.data.examplePayload || {});
      } catch (error) {
        if (mounted) {
          setDetail(null);
        }
      } finally {
        if (mounted) {
          setDetailLoading(false);
        }
      }
    }

    loadDetail();
    return () => {
      mounted = false;
    };
  }, [selectedId]);

  useEffect(() => {
    const taskId = executeResult?.taskId;
    const modelId = selectedId ?? "";
    if (!taskId || !modelId || !executeResult?.statusSupported) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const response = await fetch(
          `/api/ai-studio/tasks/${taskId}?modelId=${encodeURIComponent(modelId)}`,
        );
        const json = (await response.json()) as TaskResponse;
        if (!response.ok || !json.success) {
          throw new Error(json.error || "Task polling failed");
        }
        if (cancelled) {
          return;
        }
        setTaskState(json.data.state);
        setTaskRaw(json.data.raw);
        setExecuteResult((current) =>
          current
            ? {
                ...current,
                mediaUrls: json.data.mediaUrls.length
                  ? json.data.mediaUrls
                  : current.mediaUrls,
              }
            : current,
        );

        if (json.data.state === "queued" || json.data.state === "running") {
          timer = setTimeout(poll, 4000);
        } else {
          refreshBenefits();
          refreshHistory();
        }
      } catch {
        if (!cancelled) {
          timer = setTimeout(poll, 6000);
        }
      }
    }

    timer = setTimeout(poll, 2000);
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [executeResult?.statusSupported, executeResult?.taskId, selectedId]);

  async function handleRun() {
    if (!selectedId) {
      return;
    }

    setRunLoading(true);
    setExecuteResult(null);
    setTaskState(null);
    setTaskRaw(null);

    try {
      const response = await fetch("/api/ai-studio/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelId: selectedId,
          payload,
        }),
      });
      const json = (await response.json()) as ExecuteResponse;
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Execution failed");
      }
      if ((json.data.reservedCredits ?? 0) > 0) {
        optimisticDeduct(json.data.reservedCredits ?? 0);
      }
      setExecuteResult(json.data);
      if (json.data.taskId) {
        setTaskState("queued");
      } else if (json.data.state) {
        setTaskState(json.data.state);
      }
      refreshHistory();
    } catch (error) {
      setExecuteResult({
        raw: {
          error: error instanceof Error ? error.message : "Execution failed",
        },
        mediaUrls: [],
        pricingRows: detail?.pricingRows ?? [],
        selectedPricing: guessSelectedPricing(detail?.pricingRows ?? [], payload),
        statusSupported: false,
      });
    } finally {
      setRunLoading(false);
    }
  }

  function updateField(path: string[], value: unknown) {
    startTransition(() => {
      setPayload((current) => setValueAtPath(current, path, value));
    });
  }

  function handlePricingSelection(row: AiStudioPublicPricingRow) {
    startTransition(() => {
      setPayload((current) => applyPricingRowToPayload(current, row));
    });
  }

  async function handleFileField(field: FieldDescriptor, file: File | null) {
    if (!file) {
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    if (field.schema.type === "array") {
      updateField(field.path, [dataUrl]);
      return;
    }

    updateField(field.path, dataUrl);
  }

  const fields = detail
    ? collectFields(detail.requestSchema, payload)
    : [];
  const runtimeModels = collectRuntimeModels(detail?.pricingRows ?? []);
  const selectedPricing =
    executeResult?.selectedPricing ||
    guessSelectedPricing(detail?.pricingRows ?? [], payload);
  const chatText = executeResult ? extractChatText(executeResult.raw) : "";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.15),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_24%),linear-gradient(180deg,#f5f7fb_0%,#eef4ff_42%,#f6f9fc_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.18),transparent_22%),linear-gradient(180deg,#020617_0%,#0f172a_42%,#111827_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:34px_34px] dark:bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[28px] border border-slate-200/70 bg-white/80 p-7 shadow-[0_30px_120px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_30px_120px_rgba(2,6,23,0.45)]">
            <Badge className="mb-4 rounded-full bg-slate-900 px-3 py-1 text-xs text-white dark:bg-white dark:text-slate-950">
              AI Studio
            </Badge>
            <h1 className="max-w-3xl font-['Science_Gothic'] text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              One branded workspace for every official image, video, music, and chat model.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              Browse the official model catalog, inspect the real credits, submit requests from generated forms,
              and watch results arrive in one place without exposing the underlying provider brand.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {Object.entries(CATEGORY_META).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                  <div
                    key={key}
                    className={cn(
                      "rounded-2xl border border-slate-200/70 p-4 dark:border-white/10",
                      "bg-gradient-to-br",
                      meta.accent,
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                      <Icon className="h-4 w-4" />
                      {meta.label}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {meta.blurb}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Card className="border-slate-200/70 bg-slate-950 text-white shadow-[0_24px_90px_rgba(15,23,42,0.24)] dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <WandSparkles className="h-5 w-5 text-amber-300" />
                Official Credits
              </CardTitle>
              <CardDescription className="text-slate-300">
                Credits and units come from the official pricing endpoints, not hand-maintained local constants.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-200">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Selected Rule
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {selectedPricing
                    ? `${selectedPricing.creditPrice} ${selectedPricing.creditUnit}`
                    : "Choose a model"}
                </div>
                <div className="mt-1 text-slate-300">
                  {selectedPricing?.modelDescription || "We estimate the matching row from your current payload."}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Available Credits
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    {benefits?.totalAvailableCredits ?? "Sign in"}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Async Status
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    {taskState || "Ready"}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Reserve On Run
                </div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {selectedPricing ? `${selectedPricing.creditPrice} official credits` : "Select a pricing row"}
                </div>
                <div className="mt-1 text-slate-300">
                  Settlement is tracked in AI Studio history with refund on failed tasks.
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="overflow-hidden border-slate-200/70 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
            <CardHeader className="border-b border-slate-100 dark:border-white/10">
              <CardTitle className="text-slate-900 dark:text-white">Model Catalog</CardTitle>
              <CardDescription className="dark:text-slate-300">
                Search every supported model and switch between modalities instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <Tabs
                value={activeCategory}
                onValueChange={(value) => setActiveCategory(value as AiStudioCategory)}
                className="gap-4"
              >
                <TabsList className="grid h-auto grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2 dark:bg-slate-900/80">
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="rounded-xl py-2"
                    >
                      {meta.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search model, provider, or price row"
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[640px] pr-3">
                <div className="space-y-3">
                  {catalogLoading ? (
                    <div className="flex items-center justify-center py-20 text-sm text-slate-500 dark:text-slate-400">
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Loading official catalog…
                    </div>
                  ) : catalogError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200">
                      {catalogError}
                    </div>
                  ) : filteredEntries.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                      No models matched this search.
                    </div>
                  ) : (
                    filteredEntries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setSelectedId(entry.id)}
                        className={cn(
                          "w-full rounded-2xl border p-4 text-left transition-all",
                          selectedId === entry.id
                            ? "border-slate-900 bg-slate-900 text-white shadow-lg dark:border-teal-400/60 dark:bg-slate-900"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-white/10 dark:bg-slate-950 dark:hover:border-slate-500",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">
                              {entry.title}
                            </div>
                            <div
                              className={cn(
                                "mt-1 text-xs",
                                selectedId === entry.id ? "text-slate-300" : "text-slate-500 dark:text-slate-400",
                              )}
                            >
                              {entry.provider}
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "rounded-full",
                              selectedId === entry.id
                                ? "bg-white/10 text-white"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
                            )}
                          >
                            {entry.pricingRows.length}
                          </Badge>
                        </div>
                        {entry.pricingRows[0] && (
                          <div
                            className={cn(
                              "mt-3 text-xs",
                              selectedId === entry.id ? "text-slate-200" : "text-slate-600 dark:text-slate-300",
                            )}
                          >
                            {entry.pricingRows[0].creditPrice} {entry.pricingRows[0].creditUnit}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="border-slate-200/70 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
              <CardHeader className="border-b border-slate-100 dark:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-2xl text-slate-950 dark:text-white">
                      {detail?.title || "Select a model"}
                    </CardTitle>
                    <CardDescription className="mt-1 dark:text-slate-300">
                      {detail
                        ? `${detail.provider} · ${detail.method} ${detail.endpoint}`
                        : "Choose a model from the left panel to load the official request schema and example payload."}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detail?.modelKeys.slice(0, 4).map((modelKey) => (
                      <Badge key={modelKey} className="rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {modelKey}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        Generated Request Form
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-300">
                        Built from the official OpenAPI schema and seeded with the official example payload.
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => detail && setPayload(detail.examplePayload)}
                      disabled={!detail}
                    >
                      Reset Example
                    </Button>
                  </div>

                  {detailLoading ? (
                    <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Loading model detail…
                    </div>
                  ) : !detail ? (
                    <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                      Pick a model to begin.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {runtimeModels.length > 1 && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/70">
                          <div className="mb-2 text-sm font-medium text-slate-900 dark:text-white">
                            Runtime Model Variant
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-300">
                            Pricing rows can point to different runtime models even when the schema exposes one default.
                          </div>
                          <select
                            value={typeof payload.model === "string" ? payload.model : ""}
                            onChange={(event) => updateField(["model"], event.target.value)}
                            className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                          >
                            {runtimeModels.map((runtimeModel) => (
                              <option key={runtimeModel} value={runtimeModel}>
                                {runtimeModel}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {fields.map((field) => {
                        const fieldType = field.schema.type;
                        const enumValues = Array.isArray(field.schema.enum)
                          ? field.schema.enum
                          : [];
                        const key = field.path.join(".");
                        const isLargeText =
                          key.includes("prompt") ||
                          key.includes("lyrics") ||
                          key.includes("style") ||
                          key.includes("content");
                        const isJsonField =
                          fieldType === "array" ||
                          fieldType === "object" ||
                          key.includes("messages") ||
                          key.includes("tools");
                        const showImageUpload = matchesPayloadField(field, "image");
                        const showAudioUpload = matchesPayloadField(field, "audio");
                        const showVideoUpload = matchesPayloadField(field, "video");

                        return (
                          <div
                            key={key}
                            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/70"
                          >
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <label className="text-sm font-medium text-slate-900 dark:text-white">
                                {field.label}
                              </label>
                              {field.schema.description && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {String(field.schema.description).slice(0, 120)}
                                </span>
                              )}
                            </div>

                            {enumValues.length > 0 ? (
                              <select
                                value={field.value ?? ""}
                                onChange={(event) =>
                                  updateField(field.path, event.target.value)
                                }
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                              >
                                {enumValues.map((option) => (
                                  <option key={String(option)} value={String(option)}>
                                    {String(option)}
                                  </option>
                                ))}
                              </select>
                            ) : fieldType === "boolean" ? (
                              <label className="inline-flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                                <input
                                  type="checkbox"
                                  checked={Boolean(field.value)}
                                  onChange={(event) =>
                                    updateField(field.path, event.target.checked)
                                  }
                                  className="h-4 w-4 rounded border-slate-300 dark:border-white/20"
                                />
                                Enable
                              </label>
                            ) : fieldType === "number" || fieldType === "integer" ? (
                              <Input
                                type="number"
                                value={field.value ?? ""}
                                onChange={(event) =>
                                  updateField(
                                    field.path,
                                    event.target.value === ""
                                      ? ""
                                      : Number(event.target.value),
                                  )
                                }
                              />
                            ) : isJsonField ? (
                              <Textarea
                                value={JSON.stringify(
                                  field.value ??
                                    (fieldType === "array" ? [] : {}),
                                  null,
                                  2,
                                )}
                                onChange={(event) => {
                                  const next = event.target.value;
                                  try {
                                    updateField(field.path, JSON.parse(next));
                                  } catch {
                                    updateField(field.path, next);
                                  }
                                }}
                                rows={8}
                                className="font-mono text-xs"
                              />
                            ) : isLargeText ? (
                              <Textarea
                                value={field.value ?? ""}
                                onChange={(event) =>
                                  updateField(field.path, event.target.value)
                                }
                                rows={5}
                              />
                            ) : (
                              <Input
                                value={field.value ?? ""}
                                onChange={(event) =>
                                  updateField(field.path, event.target.value)
                                }
                              />
                            )}

                            {(showImageUpload || showAudioUpload || showVideoUpload) && (
                              <div className="mt-3 flex flex-wrap gap-3">
                                {showImageUpload && (
                                  <label className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
                                    Upload image
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(event) =>
                                        handleFileField(field, event.target.files?.[0] ?? null)
                                      }
                                    />
                                  </label>
                                )}
                                {showAudioUpload && (
                                  <label className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
                                    Upload audio
                                    <input
                                      type="file"
                                      accept="audio/*"
                                      className="hidden"
                                      onChange={(event) =>
                                        handleFileField(field, event.target.files?.[0] ?? null)
                                      }
                                    />
                                  </label>
                                )}
                                {showVideoUpload && (
                                  <label className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200">
                                    Upload video
                                    <input
                                      type="file"
                                      accept="video/*"
                                      className="hidden"
                                      onChange={(event) =>
                                        handleFileField(field, event.target.files?.[0] ?? null)
                                      }
                                    />
                                  </label>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-950 px-5 py-4 text-white dark:border-white/10">
                    <div>
                      <div className="text-sm text-slate-300">
                        Estimated official pricing rule
                      </div>
                      <div className="text-lg font-semibold">
                        {selectedPricing
                          ? `${selectedPricing.creditPrice} ${selectedPricing.creditUnit}`
                          : "No pricing row matched yet"}
                      </div>
                    </div>
                    <Button
                      onClick={handleRun}
                      disabled={!detail || runLoading}
                      className="rounded-full bg-white px-6 text-slate-950 hover:bg-slate-100 dark:bg-teal-300 dark:hover:bg-teal-200"
                    >
                      {runLoading ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Running
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Run Model
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <Card className="border-slate-200 bg-slate-50/60 shadow-none dark:border-white/10 dark:bg-slate-900/70">
                    <CardHeader>
                      <CardTitle className="text-lg text-slate-900 dark:text-white">
                        Official Pricing Rows
                      </CardTitle>
                      <CardDescription className="dark:text-slate-300">
                        These values are sourced from the live pricing endpoints.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(detail?.pricingRows ?? []).length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                          No official pricing rows were matched for this entry yet.
                        </div>
                      ) : (
                        detail?.pricingRows.map((row) => (
                          <button
                            key={`${row.modelDescription}-${row.creditPrice}`}
                            type="button"
                            onClick={() => handlePricingSelection(row)}
                            className={cn(
                              "w-full rounded-2xl border p-4 text-left transition-colors",
                              selectedPricing?.modelDescription === row.modelDescription
                                ? "border-slate-950 bg-slate-950 text-white dark:border-teal-400/60"
                                : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950",
                            )}
                          >
                            <div className={cn(
                              "text-sm font-semibold",
                              selectedPricing?.modelDescription === row.modelDescription
                                ? "text-white"
                                : "text-slate-900 dark:text-white",
                            )}>
                              {row.modelDescription}
                            </div>
                            <div
                              className={cn(
                                "mt-2 text-sm",
                                selectedPricing?.modelDescription === row.modelDescription
                                  ? "text-slate-200"
                                  : "text-slate-600 dark:text-slate-300",
                              )}
                            >
                              {row.creditPrice} {row.creditUnit}
                            </div>
                            <div
                              className={cn(
                                "mt-1 text-xs",
                                selectedPricing?.modelDescription === row.modelDescription
                                  ? "text-slate-300"
                                  : "text-slate-500 dark:text-slate-400",
                              )}
                            >
                              ${row.usdPrice || "-"} · Compared price ${row.falPrice || "N/A"}
                            </div>
                            {row.runtimeModel && (
                              <div
                                className={cn(
                                  "mt-2 text-xs font-mono",
                                  selectedPricing?.modelDescription === row.modelDescription
                                    ? "text-slate-300"
                                    : "text-slate-500 dark:text-slate-400",
                                )}
                              >
                                model: {row.runtimeModel}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 bg-white shadow-none dark:border-white/10 dark:bg-slate-950/80">
                    <CardHeader>
                      <CardTitle className="text-lg text-slate-900 dark:text-white">
                        Result Console
                      </CardTitle>
                      <CardDescription className="dark:text-slate-300">
                        Direct output, task polling state, and media previews.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {executeResult?.generationId && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900">
                          <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                            Generation
                          </div>
                          <div className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                            {executeResult.generationId}
                          </div>
                          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Reserved {executeResult.reservedCredits ?? 0} credits
                          </div>
                        </div>
                      )}

                      {taskState && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900">
                          <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                            Task State
                          </div>
                          <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">
                            {taskState}
                          </div>
                        </div>
                      )}

                      {chatText && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
                          {chatText}
                        </div>
                      )}

                      {executeResult?.mediaUrls?.length ? (
                        <div className="grid gap-4">
                          {executeResult.mediaUrls.map((url) => (
                            <div
                              key={url}
                              className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900"
                            >
                              {looksLikeImage(url) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={url}
                                  alt="Generated result"
                                  className="h-auto w-full"
                                />
                              ) : looksLikeVideo(url) ? (
                                <video
                                  src={url}
                                  controls
                                  className="h-auto w-full"
                                />
                              ) : looksLikeAudio(url) ? (
                                <div className="p-4">
                                  <audio src={url} controls className="w-full" />
                                </div>
                              ) : (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block p-4 text-sm font-medium text-sky-700 underline dark:text-sky-300"
                                >
                                  Open generated asset
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 dark:border-white/10">
                        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                          Raw Response
                        </div>
                        <pre className="max-h-[340px] overflow-auto whitespace-pre-wrap break-all text-xs leading-6 text-slate-100">
                          {JSON.stringify(taskRaw ?? executeResult?.raw ?? {}, null, 2)}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 bg-white shadow-none dark:border-white/10 dark:bg-slate-950/80">
                    <CardHeader>
                      <CardTitle className="text-lg text-slate-900 dark:text-white">
                        Recent Generations
                      </CardTitle>
                      <CardDescription className="dark:text-slate-300">
                        Local AI Studio records with reserve and refund state.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {historyLoading ? (
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Loading history…
                        </div>
                      ) : historyItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                          No AI Studio generations yet.
                        </div>
                      ) : (
                        historyItems.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/70"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {item.title}
                                </div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {item.id}
                                </div>
                              </div>
                              <Badge className="rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                {item.status}
                              </Badge>
                            </div>
                            <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                              Reserved {item.reservedCredits} · Refunded {item.refundedCredits}
                            </div>
                            {item.statusReason && (
                              <div className="mt-2 text-xs text-rose-600 dark:text-rose-300">
                                {item.statusReason}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
