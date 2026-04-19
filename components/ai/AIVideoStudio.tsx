"use client";

import AIVideoStudioFields from "@/components/ai/AIVideoStudioFields";
import AIVideoStudioMediaPreview, {
  type AIVideoStudioPreview,
} from "@/components/ai/AIVideoStudioMediaPreview";
import { collectApiFieldDocs } from "@/components/ai/AIVideoStudioApiDocs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AI_VIDEO_STUDIO_FAMILIES,
  getAiVideoStudioSelectionFromModelId,
  getAiVideoStudioVersions,
  type AiVideoStudioFamilyKey,
  type AiVideoStudioVersionKey,
  resolveAiVideoStudioModelId,
} from "@/config/ai-video-studio";
import { useUserBenefits } from "@/hooks/useUserBenefits";
import { authClient } from "@/lib/auth/auth-client";
import {
  buildAiVideoStudioPayload,
  restoreAiVideoStudioFormState,
  type AiVideoStudioFormValues,
} from "@/lib/ai-video-studio/adapter";
import {
  AI_VIDEO_STUDIO_FORM_STORAGE_KEY,
  safeParseAiVideoStudioStoredState,
  serializeAiVideoStudioStoredState,
} from "@/lib/ai-video-studio/storage";
import {
  shouldShowAiVideoStudioSignedInUi,
} from "@/lib/ai-video-studio/view";
import {
  mergeAiVideoStudioFormValues,
  normalizeAiVideoStudioSchema,
} from "@/lib/ai-video-studio/schema";
import type {
  AiStudioPublicDocDetail,
  AiStudioPublicPricingRow,
} from "@/lib/ai-studio/public";
import {
  getSeedancePricingExplanation,
  LOCAL_REFERENCE_METADATA_KEY,
} from "@/lib/ai-studio/seedance-pricing";
import {
  applyPricingRowToPayload,
  getEstimatedCreditsForPricing,
  resolveSelectedPricing,
} from "@/lib/ai-studio/runtime";
import { cn } from "@/lib/utils";
import {
  Copy,
  Download,
  Image as ImageIcon,
  Images,
  Loader2,
  Play,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import HeroPromptCarousel from "@/components/home/seedance/HeroPromptCarousel";
import {
  ModelSelector,
  type ModelSelectorItem,
  type ModelSelectorVersionItem,
} from "@/components/home/seedance/ModelSelector";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

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
    mediaUrls: string[];
    selectedPricing?: AiStudioPublicPricingRow | null;
  };
  error?: string;
};

type TaskResponse = {
  success: boolean;
  data: {
    state: string;
    mediaUrls: string[];
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
      status: string;
      providerTaskId: string | null;
      isPublic: boolean;
      reservedCredits: number;
      resultUrls: string[];
      createdAt: string;
      requestPayload: Record<string, any>;
    }>;
  };
  error?: string;
};

type GenerationTaskState = "queued" | "running" | "succeeded" | "failed";

type GenerationTask = {
  localId: string;
  taskId?: string;
  state: GenerationTaskState;
  mediaUrls: string[];
  familyKey: AiVideoStudioFamilyKey;
  versionKey: AiVideoStudioVersionKey;
  modelId: string;
  prompt: string;
  isPublic: boolean;
  formValues: AiVideoStudioFormValues;
  payload: Record<string, any>;
  creditsRequired: number;
  selectedPricing: AiStudioPublicPricingRow | null;
  progress: number;
  createdAt: number;
};

type SubmitMode = "form" | "api";
type GeneratedMediaKind = "image" | "video";

const POLLING_ERROR_LIMIT = 3;
const VISIBLE_GENERATION_TASK_COUNT = 5;

function createLocalTaskId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resolveGenerationTaskState(
  state: string | null | undefined,
): GenerationTaskState {
  if (state === "succeeded") {
    return "succeeded";
  }

  if (state === "failed") {
    return "failed";
  }

  return state === "queued" ? "queued" : "running";
}

function hasRequiredFieldValue(value: unknown) {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function getValueAtPath(source: Record<string, unknown>, path: string[]) {
  let current: unknown = source;

  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function setValueAtPath(
  source: Record<string, unknown>,
  path: string[],
  value: unknown,
) {
  const next = structuredClone(source);
  let cursor = next;

  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index]!;
    const current = cursor[segment];

    if (!current || typeof current !== "object" || Array.isArray(current)) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  }

  cursor[path[path.length - 1]!] = value;
  return next;
}

function findValueByKey(source: Record<string, unknown>, key: string): unknown {
  if (key in source) {
    return source[key];
  }

  for (const value of Object.values(source)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }

    const nested = findValueByKey(value as Record<string, unknown>, key);
    if (nested !== undefined) {
      return nested;
    }
  }

  return undefined;
}

function mergeReferenceMetadata(
  source: AiVideoStudioFormValues,
  metadata: {
    videoDurationsByUrl?: Record<string, number>;
    audioDurationsByUrl?: Record<string, number>;
  },
) {
  const existing =
    source[LOCAL_REFERENCE_METADATA_KEY] &&
    typeof source[LOCAL_REFERENCE_METADATA_KEY] === "object" &&
    !Array.isArray(source[LOCAL_REFERENCE_METADATA_KEY])
      ? (source[LOCAL_REFERENCE_METADATA_KEY] as Record<string, unknown>)
      : {};
  const existingVideoDurations =
    existing.videoDurationsByUrl &&
    typeof existing.videoDurationsByUrl === "object" &&
    !Array.isArray(existing.videoDurationsByUrl)
      ? (existing.videoDurationsByUrl as Record<string, number>)
      : {};
  const existingAudioDurations =
    existing.audioDurationsByUrl &&
    typeof existing.audioDurationsByUrl === "object" &&
    !Array.isArray(existing.audioDurationsByUrl)
      ? (existing.audioDurationsByUrl as Record<string, number>)
      : {};

  return {
    ...source,
    [LOCAL_REFERENCE_METADATA_KEY]: {
      ...existing,
      ...(metadata.videoDurationsByUrl
        ? {
            videoDurationsByUrl: {
              ...existingVideoDurations,
              ...metadata.videoDurationsByUrl,
            },
          }
        : {}),
      ...(metadata.audioDurationsByUrl
        ? {
            audioDurationsByUrl: {
              ...existingAudioDurations,
              ...metadata.audioDurationsByUrl,
            },
          }
        : {}),
    },
  };
}

function usesApiInputEnvelope(detail: {
  requestSchema?: Record<string, any> | null;
  examplePayload?: Record<string, any> | null;
}) {
  const inputSchema = detail.requestSchema?.properties?.input;

  if (
    inputSchema &&
    typeof inputSchema === "object" &&
    inputSchema.type === "object" &&
    inputSchema.properties
  ) {
    return true;
  }

  return Boolean(
    detail.examplePayload?.input &&
      typeof detail.examplePayload.input === "object" &&
      !Array.isArray(detail.examplePayload.input),
  );
}

function getApiPayloadSchemaRoot(requestSchema?: Record<string, any> | null) {
  const inputSchema = requestSchema?.properties?.input;

  if (
    inputSchema &&
    typeof inputSchema === "object" &&
    inputSchema.type === "object" &&
    inputSchema.properties
  ) {
    return inputSchema as Record<string, any>;
  }

  return requestSchema ?? null;
}

function isApiCallbackField(key: string) {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]+/g, "");

  return (
    normalized === "callback" ||
    normalized === "callbackurl" ||
    normalized === "progresscallbackurl" ||
    normalized === "webhookurl"
  );
}

function getApiEmptyValueForSchema(schema: Record<string, any>) {
  if (schema.default !== undefined) {
    return structuredClone(schema.default);
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0] ?? "";
  }

  if (schema.type === "array") {
    return [];
  }

  if (
    schema.type === "object" &&
    schema.properties &&
    !Array.isArray(schema.enum)
  ) {
    return materializeApiPayloadFormValues(schema, {});
  }

  if (schema.type === "string") {
    return "";
  }

  return null;
}

function materializeApiPayloadFormValues(
  schema: Record<string, any> | null | undefined,
  formValues: AiVideoStudioFormValues,
) {
  const properties = (schema?.properties ?? {}) as Record<
    string,
    Record<string, any>
  >;
  const source =
    formValues && typeof formValues === "object" && !Array.isArray(formValues)
      ? formValues
      : {};

  if (Object.keys(properties).length === 0) {
    return structuredClone(source);
  }

  const next: Record<string, unknown> = {};

  for (const [key, childSchema] of Object.entries(properties)) {
    if (key === "model" || isApiCallbackField(key)) {
      continue;
    }

    const currentValue = source[key];
    const isNestedObject =
      childSchema?.type === "object" &&
      childSchema.properties &&
      !Array.isArray(childSchema.enum);

    if (isNestedObject) {
      next[key] = materializeApiPayloadFormValues(
        childSchema,
        currentValue as AiVideoStudioFormValues,
      );
      continue;
    }

    next[key] =
      currentValue !== undefined
        ? structuredClone(currentValue)
        : getApiEmptyValueForSchema(childSchema);
  }

  for (const [key, value] of Object.entries(source)) {
    if (key in properties || key === "model" || isApiCallbackField(key)) {
      continue;
    }

    next[key] = structuredClone(value);
  }

  return next;
}

function buildApiModePayload(input: {
  detail: {
    examplePayload?: Record<string, any> | null;
    requestSchema?: Record<string, any> | null;
  };
  formValues: AiVideoStudioFormValues;
  selectedPricing?: AiStudioPublicPricingRow | null;
}) {
  const basePayload = input.detail.examplePayload ?? {};
  const nextPayload = materializeApiPayloadFormValues(
    getApiPayloadSchemaRoot(input.detail.requestSchema),
    input.formValues,
  ) as Record<string, unknown>;

  const payload = (
    usesApiInputEnvelope(input.detail)
      ? {
          ...(typeof basePayload.model === "string"
            ? { model: basePayload.model }
            : {}),
          input: nextPayload,
        }
      : {
          ...(typeof basePayload.model === "string"
            ? { model: basePayload.model }
            : {}),
          ...nextPayload,
        }
  ) as Record<string, any>;

  if (input.selectedPricing) {
    return applyPricingRowToPayload(payload, input.selectedPricing);
  }

  return payload;
}

function resolveGeneratedMediaKind(
  modelId?: string | null,
): GeneratedMediaKind {
  return typeof modelId === "string" && modelId.startsWith("image:")
    ? "image"
    : "video";
}

function inferDownloadExtension(url: string, kind: GeneratedMediaKind) {
  try {
    const pathname = new URL(url).pathname;
    const extension = pathname.split(".").pop()?.toLowerCase();

    if (extension && /^[a-z0-9]+$/.test(extension)) {
      return extension;
    }
  } catch {
    // ignore URL parsing errors
  }

  return kind === "image" ? "png" : "mp4";
}

function mapHistoryItemToGenerationTask(
  item: HistoryResponse["data"]["items"][number],
): GenerationTask | null {
  if (item.category !== "image" && item.category !== "video") {
    return null;
  }

  const selection = getAiVideoStudioSelectionFromModelId(item.catalogModelId);
  if (!selection) {
    return null;
  }

  const restored = restoreAiVideoStudioFormState({
    familyKey: selection.familyKey,
    versionKey: selection.versionKey,
    isPublic: item.isPublic,
    payload: item.requestPayload,
  });
  const promptValue = findValueByKey(restored.formValues, "prompt");

  return {
    localId: item.id,
    taskId: item.providerTaskId ?? undefined,
    state: resolveGenerationTaskState(item.status),
    mediaUrls: item.resultUrls,
    familyKey: selection.familyKey,
    versionKey: selection.versionKey,
    modelId: item.catalogModelId,
    prompt:
      typeof promptValue === "string" && promptValue.trim().length > 0
        ? promptValue.trim()
        : "-",
    isPublic: item.isPublic,
    formValues: restored.formValues,
    payload: item.requestPayload,
    creditsRequired: item.reservedCredits,
    selectedPricing: null,
    progress:
      item.status === "succeeded" || item.status === "failed" ? 100 : 10,
    createdAt: new Date(item.createdAt).getTime(),
  };
}

export default function AIVideoStudio() {
  const t = useTranslations("Landing.Hero");
  const { data: session } = authClient.useSession();
  const {
    benefits,
    isLoading: isLoadingBenefits,
    mutate: refreshBenefits,
    optimisticDeduct,
  } = useUserBenefits();
  const hasInitializedFromStorageRef = useRef(false);
  const pollingTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  );
  const pollingErrorCountsRef = useRef<Map<string, number>>(new Map());

  const [selectedFamilyKey, setSelectedFamilyKey] =
    useState<AiVideoStudioFamilyKey>("sora2");
  const [selectedVersionKey, setSelectedVersionKey] =
    useState<AiVideoStudioVersionKey>("sora-2");
  const [detail, setDetail] = useState<AiStudioPublicDocDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<AiVideoStudioFormValues>({});
  const [submitMode, setSubmitMode] = useState<SubmitMode>("form");
  const [apiPayloadText, setApiPayloadText] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationTasks, setGenerationTasks] = useState<GenerationTask[]>([]);
  const [activeTaskLocalId, setActiveTaskLocalId] = useState<string | null>(
    null,
  );
  const [selectedPreview, setSelectedPreview] =
    useState<AIVideoStudioPreview | null>(null);
  const [hasClientMounted, setHasClientMounted] = useState(false);

  const availableFamilies = AI_VIDEO_STUDIO_FAMILIES;
  const availableVersions = useMemo(
    () => getAiVideoStudioVersions(selectedFamilyKey),
    [selectedFamilyKey],
  );
  const selectedVersion = useMemo(
    () =>
      availableVersions.find((version) => version.key === selectedVersionKey) ??
      availableVersions[0] ??
      null,
    [availableVersions, selectedVersionKey],
  );
  const resolvedModelId = useMemo(
    () =>
      selectedVersion
        ? resolveAiVideoStudioModelId({
            familyKey: selectedFamilyKey,
            versionKey: selectedVersion.key,
          })
        : null,
    [selectedFamilyKey, selectedVersionKey, selectedVersion],
  );

  useEffect(() => {
    setHasClientMounted(true);
  }, []);

  useEffect(() => {
    if (availableVersions.length === 0) {
      return;
    }

    if (
      !availableVersions.some((version) => version.key === selectedVersionKey)
    ) {
      setSelectedVersionKey(availableVersions[0]!.key);
    }
  }, [availableVersions, selectedVersionKey]);

  useEffect(() => {
    if (!resolvedModelId) {
      setDetail(null);
      setDetailError(t("form.unsupportedCombination"));
      return;
    }

    let mounted = true;

    async function loadDetail() {
      const requestedModelId = resolvedModelId;
      if (!requestedModelId) {
        return;
      }
      setDetailLoading(true);
      setDetailError(null);
      try {
        const response = await fetch(
          `/api/ai-studio/models/${encodeURIComponent(requestedModelId)}`,
        );
        const json = (await response.json()) as DetailResponse;
        if (!response.ok || !json.success) {
          throw new Error(json.error || "Failed to load model detail");
        }
        if (!mounted) {
          return;
        }
        setDetail(json.data);
      } catch (error: any) {
        if (!mounted) {
          return;
        }
        setDetail(null);
        setDetailError(error?.message || "Failed to load model detail");
      } finally {
        if (mounted) {
          setDetailLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      mounted = false;
    };
  }, [resolvedModelId, t]);

  const normalizedSchema = useMemo(
    () => (detail ? normalizeAiVideoStudioSchema(detail) : null),
    [detail],
  );

  useEffect(() => {
    if (!normalizedSchema) {
      return;
    }

    setFormValues((previous) =>
      mergeAiVideoStudioFormValues({
        fields: normalizedSchema.fields,
        defaults: normalizedSchema.defaults,
        previousValues: previous,
      }),
    );
  }, [normalizedSchema]);

  useEffect(() => {
    if (hasInitializedFromStorageRef.current) {
      return;
    }

    const rawNewState = window.localStorage.getItem(
      AI_VIDEO_STUDIO_FORM_STORAGE_KEY,
    );
    const state = safeParseAiVideoStudioStoredState(rawNewState);
    if (state) {
      setSelectedFamilyKey(state.familyKey);
      setSelectedVersionKey(state.versionKey);
      setFormValues(state.formValues);
      setIsPublic(state.isPublic);
      hasInitializedFromStorageRef.current = true;
      return;
    }

    hasInitializedFromStorageRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasInitializedFromStorageRef.current) {
      return;
    }

    const serialized = serializeAiVideoStudioStoredState({
      familyKey: selectedFamilyKey,
      versionKey: selectedVersionKey,
      isPublic,
      formValues,
    });

    try {
      window.localStorage.setItem(AI_VIDEO_STUDIO_FORM_STORAGE_KEY, serialized);
    } catch {
      // ignore storage errors
    }
  }, [formValues, isPublic, selectedFamilyKey, selectedVersionKey]);

  const formBasePayload = useMemo(
    () =>
      detail
        ? buildAiVideoStudioPayload({
            detail,
            formValues,
          })
        : null,
    [detail, formValues],
  );

  const formSelectedPricing = useMemo(
    () =>
      detail && formBasePayload
        ? resolveSelectedPricing(detail.pricingRows, {
            modelId: detail.id,
            payload: formBasePayload,
            pricing: detail.pricing,
          })
        : null,
    [detail, formBasePayload],
  );
  const formPricingExplanation = useMemo(
    () =>
      detail && formBasePayload
        ? getSeedancePricingExplanation({
            model: detail.id,
            payload: formBasePayload,
          })
        : null,
    [detail, formBasePayload],
  );

  const formInputPayload = useMemo(
    () =>
      detail && formBasePayload
        ? buildAiVideoStudioPayload({
            detail,
            formValues,
            selectedPricing: formSelectedPricing,
          })
        : null,
    [detail, formBasePayload, formSelectedPricing, formValues],
  );

  const defaultApiPayload = useMemo(
    () =>
      detail
        ? buildApiModePayload({
            detail,
            formValues,
            selectedPricing: formSelectedPricing,
          })
        : null,
    [detail, formSelectedPricing, formValues],
  );

  useEffect(() => {
    if (submitMode !== "api") {
      return;
    }

    setApiPayloadText(JSON.stringify(defaultApiPayload ?? {}, null, 2));
  }, [defaultApiPayload, submitMode]);

  const apiPayloadState = useMemo(() => {
    if (submitMode !== "api") {
      return {
        payload: null as Record<string, any> | null,
        error: null as string | null,
      };
    }

    if (!apiPayloadText.trim()) {
      return {
        payload: null,
        error: "JSON payload is required.",
      };
    }

    try {
      const parsed = JSON.parse(apiPayloadText);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {
          payload: null,
          error: "JSON payload must be an object.",
        };
      }

      return {
        payload: parsed as Record<string, any>,
        error: null,
      };
    } catch {
      return {
        payload: null,
        error: "Invalid JSON payload.",
      };
    }
  }, [apiPayloadText, submitMode]);

  const apiBasePayload = apiPayloadState.payload;
  const apiSelectedPricing = useMemo(
    () =>
      detail && apiBasePayload
        ? resolveSelectedPricing(detail.pricingRows, {
            modelId: detail.id,
            payload: apiBasePayload,
            pricing: detail.pricing,
          })
        : null,
    [apiBasePayload, detail],
  );
  const apiPricingExplanation = useMemo(
    () =>
      detail && apiBasePayload
        ? getSeedancePricingExplanation({
            model: detail.id,
            payload: apiBasePayload,
          })
        : null,
    [apiBasePayload, detail],
  );
  const apiInputPayload = useMemo(
    () =>
      apiBasePayload
        ? apiSelectedPricing
          ? applyPricingRowToPayload(apiBasePayload, apiSelectedPricing)
          : apiBasePayload
        : null,
    [apiBasePayload, apiSelectedPricing],
  );

  const basePayload = submitMode === "api" ? apiBasePayload : formBasePayload;
  const selectedPricing =
    submitMode === "api" ? apiSelectedPricing : formSelectedPricing;
  const pricingExplanation =
    submitMode === "api" ? apiPricingExplanation : formPricingExplanation;
  const inputPayload =
    submitMode === "api" ? apiInputPayload : formInputPayload;
  const apiFieldDocs = useMemo(
    () =>
      detail
        ? collectApiFieldDocs({
            requestSchema: detail.requestSchema,
            copy: {
              required: t("form.apiFieldDocRequired"),
              type: t("form.apiFieldDocType"),
              enum: t("form.apiFieldDocEnum"),
              range: t("form.apiFieldDocRange"),
              minimum: t("form.apiFieldDocMinimum"),
              maximum: t("form.apiFieldDocMaximum"),
            },
          })
        : [],
    [detail, t],
  );

  const estimatedCredits = useMemo(
    () => getEstimatedCreditsForPricing(selectedPricing, basePayload),
    [basePayload, selectedPricing],
  );
  const shouldShowPublicInAdvanced =
    normalizedSchema?.usesDefaultAdvancedGrouping === true ||
    selectedFamilyKey === "seedance-2.0";
  const selectedModelMediaKind = resolveGeneratedMediaKind(resolvedModelId);

  const availableCredits = hasClientMounted
    ? (benefits?.totalAvailableCredits ?? null)
    : null;
  const hasSignedInSession = shouldShowAiVideoStudioSignedInUi(
    session,
    hasClientMounted,
  );
  const hasRequiredFieldValues = useMemo(
    () =>
      !normalizedSchema?.fields.some(
        (field) =>
          field.required &&
          !hasRequiredFieldValue(getValueAtPath(formValues, field.path)),
      ),
    [formValues, normalizedSchema],
  );

  const canGenerate =
    !isSubmitting &&
    !!resolvedModelId &&
    !!inputPayload &&
    (submitMode === "form" || !apiPayloadState.error) &&
    estimatedCredits > 0 &&
    (!session?.user ||
      availableCredits === null ||
      availableCredits >= estimatedCredits) &&
    (submitMode === "api" || hasRequiredFieldValues);

  const visibleGenerationTasks = useMemo(
    () => generationTasks.slice(0, VISIBLE_GENERATION_TASK_COUNT),
    [generationTasks],
  );

  const updateGenerationTask = useCallback(
    (localId: string, patch: Partial<GenerationTask>) => {
      setGenerationTasks((current) =>
        current.map((task) =>
          task.localId === localId ? { ...task, ...patch } : task,
        ),
      );
    },
    [],
  );

  const increaseTaskProgress = useCallback((localId: string) => {
    setGenerationTasks((current) =>
      current.map((task) =>
        task.localId === localId
          ? {
              ...task,
              progress: Math.min(task.progress + 10, 95),
            }
          : task,
      ),
    );
  }, []);

  const clearTaskPolling = useCallback((localId: string) => {
    const timer = pollingTimersRef.current.get(localId);
    if (!timer) {
      pollingErrorCountsRef.current.delete(localId);
      return;
    }

    clearInterval(timer);
    pollingTimersRef.current.delete(localId);
    pollingErrorCountsRef.current.delete(localId);
  }, []);

  const pollStatus = useCallback(
    (localId: string, taskId: string, modelId: string) => {
      clearTaskPolling(localId);
      const mediaKind = resolveGeneratedMediaKind(modelId);

      const timer = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/ai-studio/tasks/${taskId}?modelId=${encodeURIComponent(modelId)}`,
          );
          const json = (await response.json()) as TaskResponse;
          if (!response.ok || !json.success) {
            throw new Error(json.error || "Task polling failed");
          }

          pollingErrorCountsRef.current.delete(localId);

          if (json.data.state === "succeeded") {
            clearTaskPolling(localId);
            updateGenerationTask(localId, {
              state: "succeeded",
              mediaUrls: json.data.mediaUrls,
              progress: 100,
            });
            setActiveTaskLocalId(localId);
            toast.success(
              t(
                mediaKind === "image"
                  ? "form.generationSuccessImage"
                  : "form.generationSuccess",
              ),
            );
            void refreshBenefits();
          } else if (json.data.state === "failed") {
            clearTaskPolling(localId);
            updateGenerationTask(localId, {
              state: "failed",
              mediaUrls: json.data.mediaUrls,
              progress: 100,
            });
            toast.error(t("form.generationFailed"));
            void refreshBenefits();
          } else {
            updateGenerationTask(localId, {
              state: resolveGenerationTaskState(json.data.state),
              mediaUrls: json.data.mediaUrls,
            });
            increaseTaskProgress(localId);
          }
        } catch {
          const nextErrorCount =
            (pollingErrorCountsRef.current.get(localId) ?? 0) + 1;
          pollingErrorCountsRef.current.set(localId, nextErrorCount);

          if (nextErrorCount >= POLLING_ERROR_LIMIT) {
            clearTaskPolling(localId);
            updateGenerationTask(localId, {
              state: "failed",
              progress: 100,
            });
            toast.error(t("form.generationFailed"));
            void refreshBenefits();
            return;
          }

          increaseTaskProgress(localId);
        }
      }, 5000);

      pollingTimersRef.current.set(localId, timer);
    },
    [
      clearTaskPolling,
      increaseTaskProgress,
      refreshBenefits,
      t,
      updateGenerationTask,
    ],
  );

  useEffect(() => {
    return () => {
      pollingTimersRef.current.forEach((timer) => clearInterval(timer));
      pollingTimersRef.current.clear();
      pollingErrorCountsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!hasSignedInSession) {
      setGenerationTasks([]);
      return;
    }

    let mounted = true;

    async function loadHistory() {
      try {
        const response = await fetch("/api/ai-studio/history?limit=5");
        const json = (await response.json()) as HistoryResponse;

        if (!response.ok || !json.success) {
          throw new Error(json.error || "Failed to load history");
        }

        if (!mounted) {
          return;
        }

        const historyTasks = json.data.items
          .map(mapHistoryItemToGenerationTask)
          .filter((task): task is GenerationTask => task !== null);

        setGenerationTasks((current) => {
          if (current.length === 0) {
            return historyTasks;
          }

          const existingTaskIds = new Set(
            current
              .map((task) => task.taskId)
              .filter((taskId): taskId is string => Boolean(taskId)),
          );

          return [
            ...current,
            ...historyTasks.filter(
              (task) => !task.taskId || !existingTaskIds.has(task.taskId),
            ),
          ];
        });
      } catch {
        // ignore history loading failures
      }
    }

    void loadHistory();

    return () => {
      mounted = false;
    };
  }, [hasSignedInSession]);

  useEffect(() => {
    generationTasks.forEach((task) => {
      if (
        !task.taskId ||
        (task.state !== "queued" && task.state !== "running") ||
        pollingTimersRef.current.has(task.localId)
      ) {
        return;
      }

      pollStatus(task.localId, task.taskId, task.modelId);
    });
  }, [generationTasks, pollStatus]);

  const handleGenerate = useCallback(async () => {
    if (
      isSubmitting ||
      !resolvedModelId ||
      !inputPayload ||
      (submitMode === "form" && !hasRequiredFieldValues)
    ) {
      return;
    }

    if (submitMode === "api" && apiPayloadState.error) {
      toast.error(apiPayloadState.error);
      return;
    }

    if (!session?.user) {
      toast.error(
        t(
          selectedModelMediaKind === "image"
            ? "form.loginRequiredImage"
            : "form.loginRequired",
        ),
      );
      return;
    }

    if (availableCredits !== null && availableCredits < estimatedCredits) {
      toast.error(t("form.insufficientCredits"));
      return;
    }

    if (estimatedCredits <= 0) {
      toast.error(t("form.modelUnavailable"));
      return;
    }

    const localTaskId = createLocalTaskId();
    const promptValue = findValueByKey(
      submitMode === "api" ? inputPayload : formValues,
      "prompt",
    );
    const prompt =
      typeof promptValue === "string" && promptValue.trim().length > 0
        ? promptValue.trim()
        : "-";
    const taskFormValues =
      submitMode === "api"
        ? restoreAiVideoStudioFormState({
            familyKey: selectedFamilyKey,
            versionKey: selectedVersionKey,
            isPublic,
            payload: inputPayload,
          }).formValues
        : { ...formValues };

    setGenerationTasks((current) => [
      {
        localId: localTaskId,
        state: "queued",
        mediaUrls: [],
        familyKey: selectedFamilyKey,
        versionKey: selectedVersionKey,
        modelId: resolvedModelId,
        prompt,
        isPublic,
        formValues: taskFormValues,
        payload: structuredClone(inputPayload),
        creditsRequired: estimatedCredits,
        selectedPricing,
        progress: 5,
        createdAt: Date.now(),
      },
      ...current,
    ]);
    setActiveTaskLocalId(localTaskId);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ai-studio/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelId: resolvedModelId,
          isPublic,
          payload: inputPayload,
        }),
      });
      const json = (await response.json()) as ExecuteResponse;
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Execution failed");
      }

      if ((json.data.reservedCredits ?? 0) > 0) {
        optimisticDeduct(json.data.reservedCredits ?? 0);
      }

      const nextState = resolveGenerationTaskState(json.data.state);
      const shouldPoll = Boolean(
        json.data.taskId &&
          json.data.statusSupported &&
          nextState !== "succeeded" &&
          nextState !== "failed",
      );

      updateGenerationTask(localTaskId, {
        taskId: json.data.taskId ?? undefined,
        state: nextState,
        mediaUrls: json.data.mediaUrls ?? [],
        selectedPricing: json.data.selectedPricing ?? selectedPricing,
        creditsRequired: json.data.reservedCredits ?? estimatedCredits,
        progress: shouldPoll ? 10 : 100,
      });

      if (nextState === "failed") {
        toast.error(t("form.generationFailed"));
        void refreshBenefits();
      } else if (!shouldPoll) {
        toast.success(
          t(
            selectedModelMediaKind === "image"
              ? "form.generationSuccessImage"
              : "form.generationSuccess",
          ),
        );
        void refreshBenefits();
      } else {
        const queuedTaskId = json.data.taskId;
        if (!queuedTaskId) {
          toast.success(
            t(
              selectedModelMediaKind === "image"
                ? "form.generationSuccessImage"
                : "form.generationSuccess",
            ),
          );
          void refreshBenefits();
          return;
        }

        toast.success(t("form.generationQueued"));
        pollStatus(localTaskId, queuedTaskId, resolvedModelId);
      }
    } catch (error: any) {
      updateGenerationTask(localTaskId, {
        state: "failed",
        progress: 100,
      });
      toast.error(error?.message || t("form.generationFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    availableCredits,
    estimatedCredits,
    formValues,
    inputPayload,
    isPublic,
    isSubmitting,
    optimisticDeduct,
    pollStatus,
    refreshBenefits,
    resolvedModelId,
    selectedFamilyKey,
    selectedPricing,
    selectedVersionKey,
    session,
    t,
    updateGenerationTask,
    hasRequiredFieldValues,
    apiPayloadState.error,
    submitMode,
    selectedModelMediaKind,
  ]);

  const activeTask = useMemo(() => {
    if (visibleGenerationTasks.length === 0) {
      return null;
    }

    if (!activeTaskLocalId) {
      return visibleGenerationTasks[0];
    }

    return (
      visibleGenerationTasks.find(
        (task) => task.localId === activeTaskLocalId,
      ) ?? visibleGenerationTasks[0]
    );
  }, [activeTaskLocalId, visibleGenerationTasks]);

  const activeResultMediaUrl = activeTask?.mediaUrls[0] ?? null;
  const activeTaskMediaKind = resolveGeneratedMediaKind(activeTask?.modelId);
  const activeImageUrls =
    activeTaskMediaKind === "image" ? (activeTask?.mediaUrls ?? []) : [];

  const handleCopyPrompt = useCallback(
    async (prompt: string) => {
      try {
        await navigator.clipboard.writeText(prompt);
        toast.success(t("form.promptCopied"));
      } catch {
        toast.error(t("form.copyFailed"));
      }
    },
    [t],
  );

  const handleDownloadMedia = useCallback(
    (url: string, taskId: string | undefined, kind: GeneratedMediaKind) => {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = `${kind}-task-${taskId || Date.now()}.${inferDownloadExtension(url, kind)}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    [],
  );

  const handleOpenImagePreview = useCallback(
    (urls: string[], index: number) => {
      if (!urls[index]) {
        return;
      }

      setSelectedPreview({
        kind: "image",
        urls,
        index,
      });
    },
    [],
  );

  const handleRemixTask = useCallback(
    (task: GenerationTask) => {
      const restored = restoreAiVideoStudioFormState({
        familyKey: task.familyKey,
        versionKey: task.versionKey,
        isPublic: task.isPublic,
        payload: task.payload,
      });

      setSelectedFamilyKey(restored.familyKey);
      setSelectedVersionKey(restored.versionKey);
      setIsPublic(restored.isPublic);
      setFormValues(restored.formValues);
      setActiveTaskLocalId(task.localId);
      toast.success(t("form.remixApplied"));
    },
    [t],
  );

  const getTaskParamsLine = useCallback((task: GenerationTask) => {
    const parts: string[] = [];
    const aspectRatio = findValueByKey(task.formValues, "aspect_ratio");
    const duration = findValueByKey(task.formValues, "duration");
    const frames = findValueByKey(task.formValues, "n_frames");

    if (typeof aspectRatio === "string" && aspectRatio) {
      parts.push(`aspect_ratio: ${aspectRatio}`);
    }

    if (
      (typeof duration === "string" && duration) ||
      typeof duration === "number"
    ) {
      parts.push(`duration: ${duration}s`);
    } else if (typeof frames === "string" && frames) {
      parts.push(`n_frames: ${frames}`);
    }

    parts.push(task.isPublic ? "public" : "private");

    return parts.join(" · ");
  }, []);

  const modelOptions = useMemo<ModelSelectorItem[]>(
    () =>
      availableFamilies.map((family) => ({
        id: family.key,
        name: family.label,
        description: family.description,
        icon: family.icon,
        tags: family.tags,
        selectable: family.selectable,
      })),
    [availableFamilies],
  );
  const versionOptions = useMemo<ModelSelectorVersionItem[]>(
    () =>
      availableVersions.map((version) => ({
        id: version.key,
        name: version.label,
      })),
    [availableVersions],
  );
  const versionLabelByKey = useMemo(
    () =>
      new Map(
        availableFamilies.flatMap((family) =>
          family.versions.map(
            (version) => [version.key, version.label] as const,
          ),
        ),
      ),
    [availableFamilies],
  );

  return (
    <main className="flex flex-1 flex-col items-center container px-0 sm:px-4">
      <div className="w-full min-w-0 max-w-7xl mx-auto">
        <div className="flex w-full min-w-0 flex-col items-start gap-8 my-10 h-full mx-auto p-2 lg:p-6 rounded-xl lg:rounded-3xl border border-border/50 bg-card shadow-xl lg:flex-row">
          <div className="w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 flex flex-col gap-3 h-fit">
            <ModelSelector
              selectedId={selectedFamilyKey}
              onSelect={(nextKey) =>
                setSelectedFamilyKey(nextKey as AiVideoStudioFamilyKey)
              }
              models={modelOptions}
              label={t("form.aiModel")}
              placeholder={t("form.selectModel")}
              versions={versionOptions}
              selectedVersionId={selectedVersionKey}
              onSelectVersion={(nextVersionKey) =>
                setSelectedVersionKey(nextVersionKey as AiVideoStudioVersionKey)
              }
              versionLabel={t("form.modelVersion")}
              labelAccessory={
                <div className="inline-flex items-center rounded-lg border border-border/60 bg-background/60 p-1">
                  {(["form", "api"] as const).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      onClick={() => setSubmitMode(mode)}
                      variant="ghost"
                      className={cn(
                        "h-auto rounded-md px-3 py-1 text-xs font-medium transition-colors hover:bg-transparent",
                        submitMode === mode
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {mode === "form"
                        ? t("form.submitModeForm")
                        : t("form.submitModeApi")}
                    </Button>
                  ))}
                </div>
              }
            />

            {detailLoading ? (
              <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("form.loadingModelSettings")}</span>
              </div>
            ) : detailError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {detailError}
              </div>
            ) : normalizedSchema && submitMode === "form" ? (
              <AIVideoStudioFields
                primaryFields={normalizedSchema.primaryFields}
                advancedFields={normalizedSchema.advancedFields}
                advancedLabel={t("form.advanced")}
                localizedFieldLabels={{
                  prompt: t("form.prompt"),
                  size: t("form.size"),
                  resolution: t("form.resolution"),
                  aspectRatio: t("form.aspectRatio"),
                  duration: t("form.duration"),
                  referenceAudios: t("form.referenceAudios"),
                  referenceImages: t("form.referenceImages"),
                  referenceVideos: t("form.referenceVideos"),
                  referenceUrls: t("form.referenceUrls"),
                }}
                publicVisibilityLabel={t("form.isPublic")}
                publicToggleLabel={t("form.public")}
                promptPlaceholder={t(
                  selectedModelMediaKind === "image"
                    ? "form.promptPlaceholderImage"
                    : "form.promptPlaceholder",
                )}
                referenceFieldTexts={{
                  useUrlLabel: t("form.useUrl"),
                  uploadTitle: t("form.uploadTitle"),
                  addButton: t("form.add"),
                  removeButton: t("form.remove"),
                  audioFormats: t("form.audioUploadFormats"),
                  imageFormats: t("form.imageUploadFormats"),
                  videoFormats: t("form.videoUploadFormats"),
                  audioDescription: (max) =>
                    t("form.audioReferenceHint", { count: max }),
                  imageDescription: (max) =>
                    t("form.imageReferenceHint", { count: max }),
                  videoDescription: (max) =>
                    t("form.videoReferenceHint", { count: max }),
                  urlDescription: (max) =>
                    t("form.urlReferenceHint", { count: max }),
                  countLabel: (current, max) =>
                    t("form.referencesCount", { current, max }),
                  invalidUrl: t("form.invalidUrl"),
                  uploadFailed: t("form.referenceUploadFailed"),
                  uploading: t("form.uploadingReference"),
                  audioOnlyError: t("form.audioOnlyError"),
                  imageOnlyError: t("form.imageOnlyError"),
                  videoOnlyError: t("form.videoOnlyError"),
                  videoDurationRequiredError: t(
                    "form.videoDurationRequiredError",
                  ),
                  uploadTooLarge: (sizeInMb) =>
                    t("form.referenceUploadTooLarge", { size: sizeInMb }),
                  audioUrlPlaceholder: t("form.audioUrlPlaceholder"),
                  imageUrlPlaceholder: t("form.imageUrlPlaceholder"),
                  videoUrlPlaceholder: t("form.videoUrlPlaceholder"),
                  genericUrlPlaceholder: t("form.genericUrlPlaceholder"),
                }}
                showPublicInAdvanced={shouldShowPublicInAdvanced}
                values={formValues}
                isPublic={isPublic}
                disabled={isSubmitting}
                onReferenceMetadataChange={(_, metadata) =>
                  setFormValues((current) =>
                    mergeReferenceMetadata(current, metadata),
                  )
                }
                onChange={(path, nextValue) =>
                  setFormValues((current) =>
                    setValueAtPath(current, path, nextValue),
                  )
                }
                onPublicChange={setIsPublic}
              />
            ) : submitMode === "api" ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {t("form.apiRequestJsonTitle")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("form.apiRequestJsonDescription")}
                      </div>
                    </div>
                  </div>
                  <Textarea
                    value={apiPayloadText}
                    onChange={(event) => setApiPayloadText(event.target.value)}
                    disabled={isSubmitting}
                    spellCheck={false}
                    className="min-h-[420px] resize-y font-mono text-xs leading-6"
                  />
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {t("form.isPublic")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("form.public")}
                      </div>
                    </div>
                    <Switch
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                      disabled={isSubmitting}
                    />
                  </div>
                  {apiPayloadState.error ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {apiPayloadState.error === "JSON payload is required."
                        ? t("form.apiJsonRequired")
                        : apiPayloadState.error ===
                            "JSON payload must be an object."
                          ? t("form.apiJsonMustBeObject")
                          : apiPayloadState.error === "Invalid JSON payload."
                            ? t("form.apiJsonInvalid")
                            : apiPayloadState.error}
                    </div>
                  ) : null}
                </div>
                {apiFieldDocs.length > 0 ? (
                  <div className="rounded-xl border border-border/60 bg-background/50 px-4 py-3">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem
                        value="api-field-docs"
                        className="border-b-0"
                      >
                        <AccordionTrigger className="py-0 hover:no-underline">
                          <div className="text-sm font-semibold text-foreground">
                            {t("form.apiFieldDocsTitle")}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-3">
                          <div className="space-y-3">
                            {apiFieldDocs.map((field) => (
                              <div
                                key={field.key}
                                className="rounded-lg border border-border/50 bg-background/60 px-3 py-2.5"
                              >
                                <div className="font-mono text-xs text-foreground">
                                  {field.title}
                                </div>
                                {field.description ? (
                                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                                    {field.description}
                                  </div>
                                ) : null}
                                {field.meta ? (
                                  <div className="mt-1 text-xs text-muted-foreground/90">
                                    {field.meta}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                ) : null}
              </div>
            ) : null}

            {hasSignedInSession ? (
              <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-2.5 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {t("form.currentCredits")}
                </div>
                <div className="font-semibold text-foreground">
                  {isLoadingBenefits
                    ? "--"
                    : t("form.creditsRequired", {
                        count: availableCredits ?? 0,
                      })}
                </div>
              </div>
            ) : null}

            <div className="mt-auto">
              {pricingExplanation ? (
                <div className="mb-3 rounded-xl border border-border/60 bg-background/35 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t("form.pricingLogicTitle")}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {pricingExplanation.hasVideoInput
                      ? t("form.pricingLogicWithVideoSummary")
                      : t("form.pricingLogicWithoutVideoSummary")}
                  </div>
                  <div className="mt-1.5 text-sm font-medium text-foreground">
                    {pricingExplanation.hasVideoInput
                      ? t("form.pricingLogicWithVideoFormula", {
                          input: pricingExplanation.inputVideoDurationSeconds,
                          output: pricingExplanation.outputDurationSeconds,
                          rate: pricingExplanation.rate,
                          credits: pricingExplanation.creditPrice,
                        })
                      : t("form.pricingLogicWithoutVideoFormula", {
                          output: pricingExplanation.outputDurationSeconds,
                          rate: pricingExplanation.rate,
                          credits: pricingExplanation.creditPrice,
                        })}
                  </div>
                </div>
              ) : null}
              <Button
                type="button"
                onClick={() => void handleGenerate()}
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
                      : `${t(
                          selectedModelMediaKind === "image"
                            ? "form.generateImage"
                            : "form.generate",
                        )} (${t("form.creditsRequired", { count: estimatedCredits })})`}
                  </span>
                </div>
              </Button>
            </div>
          </div>

          {generationTasks.length > 0 ? (
            <div className="flex-1 w-full rounded-xl border border-border/50 bg-muted/10 backdrop-blur-sm overflow-hidden relative flex flex-col shadow-sm">
              <div className="flex-1 min-h-0 h-full bg-muted/30 flex flex-col p-3 gap-3">
                <div className="relative rounded-2xl overflow-hidden bg-black h-[clamp(180px,36vh,420px)] lg:h-[clamp(220px,42vh,520px)] shrink-0">
                  <div className="h-full w-full">
                    {activeTask &&
                    (activeTask.state === "queued" ||
                      activeTask.state === "running") ? (
                      <div className="flex flex-col items-center justify-center h-full w-full gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
                        <p className="text-white/80 text-sm">
                          {t("form.generating")}
                        </p>
                        <p className="text-white/60 text-xs">
                          {activeTask.progress}%
                        </p>
                      </div>
                    ) : activeResultMediaUrl ? (
                      activeTaskMediaKind === "image" ? (
                        <div
                          className={cn(
                            "grid h-full w-full gap-2 p-2",
                            activeImageUrls.length > 1
                              ? "grid-cols-2"
                              : "grid-cols-1",
                          )}
                        >
                          {activeImageUrls.map((url, index) => (
                            <Button
                              key={`${activeTask?.localId || "active"}-${url}`}
                              type="button"
                              onClick={() =>
                                handleOpenImagePreview(activeImageUrls, index)
                              }
                              variant="ghost"
                              className="group h-full min-h-0 w-full overflow-hidden rounded-xl border border-white/10 bg-black/30 p-0 text-left hover:bg-transparent"
                            >
                              <img
                                src={url}
                                alt={activeTask?.prompt || "Generated image"}
                                className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.01]"
                              />
                              {activeImageUrls.length > 1 ? (
                                <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white">
                                  {index + 1} / {activeImageUrls.length}
                                </div>
                              ) : null}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <video
                          key={activeTask?.localId || activeResultMediaUrl}
                          src={activeResultMediaUrl}
                          playsInline
                          controls
                          autoPlay
                          className="w-full h-full object-contain"
                        />
                      )
                    ) : activeTask?.state === "failed" ? (
                      <div className="flex flex-col items-center justify-center h-full w-full gap-3 text-white/75">
                        <X className="w-8 h-8" />
                        <p className="text-sm">{t("form.generationFailed")}</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("form.tasks")}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {generationTasks.length}
                    </span>
                  </div>
                  <div className="mt-3 flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                    {visibleGenerationTasks.map((task, index) => (
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
                        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start">
                          <div className="h-40 w-full rounded-lg overflow-hidden bg-black border border-border/50 sm:h-24 sm:w-36 sm:shrink-0">
                            {task.mediaUrls[0] ? (
                              resolveGeneratedMediaKind(task.modelId) ===
                              "image" ? (
                                <div
                                  className={cn(
                                    "relative grid h-full w-full gap-0.5 p-0.5",
                                    task.mediaUrls.length > 1
                                      ? "grid-cols-2"
                                      : "grid-cols-1",
                                  )}
                                >
                                  {task.mediaUrls
                                    .slice(0, 4)
                                    .map((url, imageIndex) => (
                                      <Button
                                        key={`${task.localId}-${url}`}
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleOpenImagePreview(
                                            task.mediaUrls,
                                            imageIndex,
                                          );
                                        }}
                                        variant="ghost"
                                        className="h-full w-full overflow-hidden rounded-[6px] p-0 hover:bg-transparent"
                                      >
                                        <img
                                          src={url}
                                          alt={
                                            task.prompt ||
                                            `Generated image ${imageIndex + 1}`
                                          }
                                          className="h-full w-full object-cover"
                                        />
                                      </Button>
                                    ))}
                                  {task.mediaUrls.length > 1 ? (
                                    <div className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                      {task.mediaUrls.length}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <video
                                  src={task.mediaUrls[0]}
                                  className="w-full h-full object-cover"
                                  muted
                                  playsInline
                                  preload="metadata"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedPreview({
                                      kind: "video",
                                      url: task.mediaUrls[0]!,
                                    });
                                  }}
                                />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[11px] text-white/70">
                                {task.state === "failed"
                                  ? t("form.generationFailed")
                                  : t("form.generating")}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground">
                                <span>
                                  {t("form.task", {
                                    index: generationTasks.length - index,
                                  })}
                                </span>
                                {task.taskId ? (
                                  <span
                                    className="font-mono text-[10px] text-muted-foreground bg-background/50 border border-border/50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted transition-colors flex items-center gap-1"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      navigator.clipboard.writeText(
                                        task.taskId!,
                                      );
                                      toast.success(t("form.taskIdCopied"));
                                    }}
                                    title={t("form.copyTaskId")}
                                  >
                                    {task.taskId}
                                    <Copy className="w-2.5 h-2.5" />
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-[11px] text-muted-foreground sm:text-right">
                                {new Date(task.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground truncate">
                              {versionLabelByKey.get(task.versionKey) ??
                                task.versionKey}
                              {" · "}
                              {t("form.creditsRequired", {
                                count: task.creditsRequired,
                              })}
                              {" · "}
                              {getTaskParamsLine(task)}
                            </div>
                            <div className="mt-1 text-xs text-foreground/90 break-words line-clamp-2 overflow-hidden">
                              {task.prompt}
                            </div>
                            {task.state !== "succeeded" ? (
                              <>
                                <div className="mt-2 h-1.5 rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      task.state === "failed"
                                        ? "bg-red-500"
                                        : "bg-blue-500",
                                    )}
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                                <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
                                  {task.state === "queued" ||
                                  task.state === "running" ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : null}
                                  <span>
                                    {task.state === "failed"
                                      ? t("form.generationFailed")
                                      : `${t("form.generating")} ${task.progress}%`}
                                  </span>
                                </div>
                              </>
                            ) : null}

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (task.mediaUrls[0]) {
                                    if (
                                      resolveGeneratedMediaKind(
                                        task.modelId,
                                      ) === "image"
                                    ) {
                                      handleOpenImagePreview(task.mediaUrls, 0);
                                    } else {
                                      setSelectedPreview({
                                        kind: "video",
                                        url: task.mediaUrls[0],
                                      });
                                    }
                                  }
                                }}
                                disabled={!task.mediaUrls[0]}
                                variant="link"
                                size="xs"
                                className="h-auto gap-1 px-0 text-[11px]"
                              >
                                {resolveGeneratedMediaKind(task.modelId) ===
                                "image" ? (
                                  <ImageIcon className="w-3 h-3" />
                                ) : (
                                  <Play className="w-3 h-3" />
                                )}
                                {t("form.open")}
                              </Button>
                              <Button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (task.mediaUrls[0]) {
                                    handleDownloadMedia(
                                      task.mediaUrls[0],
                                      task.taskId,
                                      resolveGeneratedMediaKind(task.modelId),
                                    );
                                  }
                                }}
                                disabled={!task.mediaUrls[0]}
                                variant="link"
                                size="xs"
                                className="h-auto gap-1 px-0 text-[11px]"
                              >
                                <Download className="w-3 h-3" />
                                {t("form.download")}
                              </Button>
                              <Button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleCopyPrompt(task.prompt);
                                }}
                                variant="link"
                                size="xs"
                                className="h-auto gap-1 px-0 text-[11px]"
                              >
                                <Copy className="w-3 h-3" />
                                {t("form.copy")}
                              </Button>
                              <Button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRemixTask(task);
                                }}
                                variant="link"
                                size="xs"
                                className="h-auto gap-1 px-0 text-[11px]"
                              >
                                <WandSparkles className="w-3 h-3" />
                                {t("form.remix")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : selectedModelMediaKind === "image" ? (
            <div className="flex h-full min-h-[420px] w-full min-w-0 items-center justify-center rounded-xl border border-border/50 bg-muted/10 p-6">
              <div className="flex max-w-md flex-col items-center gap-3 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-background/70">
                  <Images className="size-7 text-muted-foreground" />
                </div>
                <div className="text-base font-semibold text-foreground">
                  {t("form.generateImage")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("form.historyHint")}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full min-w-0 overflow-hidden">
              <HeroPromptCarousel
                onPlayVideo={(url) =>
                  setSelectedPreview({ kind: "video", url })
                }
              />
            </div>
          )}
        </div>
      </div>

      <AIVideoStudioMediaPreview
        preview={selectedPreview}
        onClose={() => setSelectedPreview(null)}
      />
    </main>
  );
}
