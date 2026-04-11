import {
  type AiStudioCatalogEntry,
  type AiStudioDocDetail,
  type AiStudioPricingRow,
  extractPricingAnchorModel,
  findAiStudioCatalogEntryById,
  getAiStudioPublicModelId,
  getCachedAiStudioCatalog,
  getCachedAiStudioCatalogDetail,
} from "@/lib/ai-studio/catalog";
import { isRenderableAssetUrl } from "@/lib/ai-studio/media";
import {
  applyAiStudioSystemFields,
  getAiStudioTaskMeta,
  resolveStatusEndpoint,
  resolveTaskMode,
} from "@/lib/ai-studio/provider-metadata";
import { guessPricingRow } from "@/lib/ai-studio/runtime";

export {
  applyAiStudioSystemFields,
  resolveStatusEndpoint,
  resolveTaskMode,
} from "@/lib/ai-studio/provider-metadata";

export type AiStudioNormalizedState =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "unknown";

export function getAiStudioApiKey() {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    throw new Error("KIE_API_KEY is not configured");
  }
  return apiKey;
}

export function getAiStudioCallbackUrl() {
  const base =
    process.env.WEBHOOK_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;

  if (!base) {
    return null;
  }

  const callbackUrl = new URL(
    `${base.replace(/\/+$/, "")}/api/ai-studio/callback`,
  );
  const secret =
    process.env.AI_STUDIO_CALLBACK_SECRET || process.env.KIE_CALLBACK_SECRET;

  if (secret) {
    callbackUrl.searchParams.set("secret", secret);
  }

  return callbackUrl.toString();
}

export function extractTaskId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  for (const key of ["taskId", "recordId", "id"]) {
    if (typeof record[key] === "string" && record[key]) {
      return record[key] as string;
    }
  }

  for (const value of Object.values(record)) {
    const nested = extractTaskId(value);
    if (nested) {
      return nested;
    }
  }

  return null;
}

export function extractMediaUrls(raw: unknown): string[] {
  const urls = new Set<string>();

  function maybeParseJsonString(value: string) {
    const trimmed = value.trim();
    if (
      !trimmed ||
      (!trimmed.startsWith("{") &&
        !trimmed.startsWith("["))
    ) {
      return null;
    }

    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  }

  function visit(value: unknown) {
    if (!value) {
      return;
    }

    if (typeof value === "string") {
      if (isRenderableAssetUrl(value)) {
        urls.add(value);
      } else {
        const parsed = maybeParseJsonString(value);
        if (parsed) {
          visit(parsed);
        }
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    if (typeof value === "object") {
      for (const item of Object.values(value as Record<string, unknown>)) {
        visit(item);
      }
    }
  }

  visit(raw);
  return [...urls];
}

function getNestedValue(record: Record<string, unknown>, path: string[]) {
  let current: unknown = record;
  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function extractProviderFailureReason(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const taskId = extractTaskId(raw);
  const taskFailureMessages = [
    getNestedValue(record, ["data", "failMsg"]),
    getNestedValue(record, ["data", "errorMessage"]),
    getNestedValue(record, ["data", "message"]),
    record.error,
    record.message,
    record.msg,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  const genericMessages = [
    record.msg,
    record.message,
    record.error,
    getNestedValue(record, ["data", "failMsg"]),
    getNestedValue(record, ["data", "errorMessage"]),
    getNestedValue(record, ["data", "message"]),
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  const numericCodes = [
    record.code,
    record.statusCode,
    record.httpCode,
    getNestedValue(record, ["data", "code"]),
  ].filter((value): value is number => typeof value === "number");

  const taskState = String(getNestedValue(record, ["data", "state"]) ?? "").toLowerCase();
  const taskFailCode = getNestedValue(record, ["data", "failCode"]);
  const successFlag = getNestedValue(record, ["data", "successFlag"]);
  const hasTaskLevelFailure =
    taskState === "fail" ||
    taskState === "failed" ||
    typeof getNestedValue(record, ["data", "failMsg"]) === "string" ||
    typeof getNestedValue(record, ["data", "errorMessage"]) === "string" ||
    (typeof taskFailCode === "string" && taskFailCode.trim().length > 0) ||
    successFlag === 2 ||
    successFlag === 3;

  if (hasTaskLevelFailure) {
    return taskFailureMessages[0] ?? "Provider task failed";
  }

  if (record.success === false || record.ok === false) {
    return genericMessages[0] ?? "Provider request failed";
  }

  const failingCode = numericCodes.find((value) => value >= 400);
  if (typeof failingCode === "number") {
    return genericMessages[0] ?? `Provider request failed with code ${failingCode}`;
  }

  if (
    record.data === null &&
    !taskId &&
    genericMessages.length > 0 &&
    !genericMessages.some((value) => /success|completed?/i.test(value))
  ) {
    return genericMessages[0]!;
  }

  return null;
}

export function normalizeTaskState(raw: unknown): AiStudioNormalizedState {
  if (extractProviderFailureReason(raw)) {
    return "failed";
  }

  const candidate = JSON.stringify(raw).toLowerCase();

  if (
    candidate.includes('"state":"success"') ||
    candidate.includes('"status":"success"') ||
    candidate.includes('"status":"completed"') ||
    candidate.includes('"status":"complete"') ||
    candidate.includes('"successflag":1')
  ) {
    return "succeeded";
  }

  if (
    candidate.includes('"state":"fail"') ||
    candidate.includes('"status":"failed"') ||
    candidate.includes('"status":"error"') ||
    candidate.includes('"successflag":2') ||
    candidate.includes('"successflag":3')
  ) {
    return "failed";
  }

  if (
    candidate.includes('"state":"waiting"') ||
    candidate.includes('"state":"queuing"') ||
    candidate.includes('"status":"pending"') ||
    candidate.includes('"status":"queued"')
  ) {
    return "queued";
  }

  if (
    candidate.includes('"state":"generating"') ||
    candidate.includes('"status":"running"') ||
    candidate.includes('"status":"processing"') ||
    candidate.includes('"status":"in_progress"')
  ) {
    return "running";
  }

  return "unknown";
}

export function estimatePricingRow(
  pricingRows: AiStudioPricingRow[],
  payload: Record<string, any>,
) {
  return guessPricingRow(
    pricingRows.map((row) => ({
      ...row,
      runtimeModel: extractPricingAnchorModel(row.anchor),
    })),
    payload,
  );
}

export function mapPublicModelAliasToProviderModel(
  detail: Pick<AiStudioDocDetail, "alias" | "modelKeys">,
  payload: Record<string, any>,
) {
  const body = structuredClone(payload);

  if (
    detail.alias &&
    Array.isArray(detail.modelKeys) &&
    detail.modelKeys.length === 1 &&
    body.model === detail.alias
  ) {
    body.model = detail.modelKeys[0];
  }

  return body;
}

export function getCanonicalAiStudioModelId(
  entries: Array<Pick<AiStudioCatalogEntry, "id" | "category" | "alias">>,
  modelId: string,
) {
  const matched = findAiStudioCatalogEntryById(entries, modelId);

  return matched?.id ?? modelId;
}

export async function prepareAiStudioExecution(
  modelId: string,
  payload: Record<string, any>,
) {
  const catalog = await getCachedAiStudioCatalog();
  const canonicalModelId = getCanonicalAiStudioModelId(catalog, modelId);
  const detail = await getCachedAiStudioCatalogDetail(canonicalModelId);
  if (!detail) {
    throw new Error("Unknown model");
  }

  const body = mapPublicModelAliasToProviderModel(detail, payload);
  const callbackUrl = getAiStudioCallbackUrl();
  const preparedBody = applyAiStudioSystemFields(detail, body, callbackUrl);

  return {
    detail,
    body: preparedBody,
    selectedPricing: estimatePricingRow(detail.pricingRows, preparedBody),
  };
}

export async function submitAiStudioExecution(
  detail: AiStudioDocDetail,
  body: Record<string, any>,
) {
  const response = await fetch(`https://api.kie.ai${detail.endpoint}`, {
    method: detail.method,
    headers: {
      Authorization: `Bearer ${getAiStudioApiKey()}`,
      "Content-Type": "application/json",
    },
    body: detail.method === "GET" ? undefined : JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const raw = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      typeof raw === "string"
        ? raw
        : raw?.msg || raw?.message || `Execution failed with ${response.status}`,
    );
  }

  const providerFailure = extractProviderFailureReason(raw);
  if (providerFailure) {
    throw new Error(providerFailure);
  }

  const taskId = extractTaskId(raw);
  const taskMeta = getAiStudioTaskMeta(detail);

  return {
    raw,
    taskId,
    statusEndpoint: taskMeta.statusEndpoint,
    statusMode: resolveTaskMode(detail),
    mediaUrls: extractMediaUrls(raw),
  };
}

export async function executeAiStudioModel(modelId: string, payload: Record<string, any>) {
  const prepared = await prepareAiStudioExecution(modelId, payload);
  const result = await submitAiStudioExecution(prepared.detail, prepared.body);

  return {
    detail: prepared.detail,
    selectedPricing: prepared.selectedPricing,
    ...result,
  };
}

export async function queryAiStudioTask(modelId: string, taskId: string) {
  const catalog = await getCachedAiStudioCatalog();
  const canonicalModelId = getCanonicalAiStudioModelId(catalog, modelId);
  const detail = await getCachedAiStudioCatalogDetail(canonicalModelId);
  if (!detail) {
    throw new Error("Unknown model");
  }

  const statusEndpoint = resolveStatusEndpoint(detail);
  if (!statusEndpoint) {
    throw new Error("This model does not expose a task status endpoint");
  }

  const response = await fetch(
    `https://api.kie.ai${statusEndpoint}?taskId=${encodeURIComponent(taskId)}`,
    {
      headers: {
        Authorization: `Bearer ${getAiStudioApiKey()}`,
      },
    },
  );

  const contentType = response.headers.get("content-type") ?? "";
  const raw = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      typeof raw === "string"
        ? raw
        : raw?.msg || raw?.message || `Task query failed with ${response.status}`,
    );
  }

  return {
    detail,
    raw,
    state: normalizeTaskState(raw),
    mediaUrls: extractMediaUrls(raw),
  };
}
