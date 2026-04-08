import {
  type AiStudioCatalogEntry,
  type AiStudioDocDetail,
  type AiStudioPricingRow,
  type AiStudioVendor,
  extractPricingAnchorModel,
  findAiStudioCatalogEntryById,
  getCachedAiStudioCatalog,
  getCachedAiStudioCatalogDetail,
} from "@/lib/ai-studio/catalog";
import { isRenderableAssetUrl } from "@/lib/ai-studio/media";
import { guessPricingRow } from "@/lib/ai-studio/runtime";

export type AiStudioNormalizedState =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "unknown";

export function resolveAiStudioVendor(
  detail: Pick<AiStudioDocDetail, "vendor"> | Pick<AiStudioCatalogEntry, "vendor">,
): AiStudioVendor {
  return detail.vendor ?? "kie";
}

export function getAiStudioApiKey(vendor: AiStudioVendor = "kie") {
  const apiKey =
    vendor === "apimart"
      ? process.env.APIMART_API_KEY
      : process.env.KIE_API_KEY;

  if (!apiKey) {
    throw new Error(
      vendor === "apimart"
        ? "APIMART_API_KEY is not configured"
        : "KIE_API_KEY is not configured",
    );
  }

  return apiKey;
}

function getAiStudioApiBaseUrl(vendor: AiStudioVendor) {
  return vendor === "apimart" ? "https://api.apimart.ai" : "https://api.kie.ai";
}

function vendorSupportsCallback(vendor: AiStudioVendor) {
  return vendor === "kie";
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

export function resolveStatusEndpoint(detail: AiStudioDocDetail) {
  if (resolveAiStudioVendor(detail) === "apimart") {
    return "/v1/tasks/:taskId";
  }

  const docUrl = detail.docUrl;

  if (detail.endpoint === "/api/v1/jobs/createTask" && docUrl.includes("/market/")) {
    return "/api/v1/jobs/recordInfo";
  }

  if (docUrl.includes("/4o-image-api/")) {
    return "/api/v1/gpt4o-image/record-info";
  }

  if (docUrl.includes("/flux-kontext-api/")) {
    return "/api/v1/flux/kontext/record-info";
  }

  if (docUrl.includes("/runway-api/")) {
    return "/api/v1/runway/record-detail";
  }

  if (docUrl.includes("/veo3-api/")) {
    return "/api/v1/veo/record-info";
  }

  if (docUrl.includes("/suno-api/")) {
    if (docUrl.includes("/cover-suno")) return "/api/v1/suno/cover/record-info";
    if (docUrl.includes("/generate-lyrics")) return "/api/v1/lyrics/record-info";
    if (docUrl.includes("/convert-to-wav")) return "/api/v1/wav/record-info";
    if (docUrl.includes("/separate-vocals")) {
      return "/api/v1/vocal-removal/record-info";
    }
    if (docUrl.includes("/generate-midi")) return "/api/v1/midi/record-info";
    if (docUrl.includes("/create-music-video")) return "/api/v1/mp4/record-info";
    return "/api/v1/generate/record-info";
  }

  return null;
}

export function extractTaskId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  for (const key of ["taskId", "task_id", "recordId", "record_id", "id"]) {
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

function normalizeApimartAspectRatio(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  if (value === "landscape") {
    return "16:9";
  }

  if (value === "portrait") {
    return "9:16";
  }

  return value;
}

function parseApimartDuration(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

function buildApimartExecutionBody(
  detail: AiStudioDocDetail,
  body: Record<string, any>,
) {
  const input =
    body.input && typeof body.input === "object"
      ? (body.input as Record<string, any>)
      : {};
  const next: Record<string, any> = {
    model: body.model ?? detail.modelKeys[0],
    ...input,
  };

  for (const [key, value] of Object.entries(body)) {
    if (key === "input" || key === "callBackUrl" || key === "progressCallBackUrl") {
      continue;
    }

    next[key] = value;
  }

  next.aspect_ratio = normalizeApimartAspectRatio(next.aspect_ratio);

  const duration = parseApimartDuration(next.duration ?? next.n_frames);
  if (duration !== undefined) {
    next.duration = duration;
  }
  delete next.n_frames;

  if (typeof next.remove_watermark === "boolean" && next.watermark === undefined) {
    next.watermark = !next.remove_watermark;
  }
  delete next.remove_watermark;

  if (next.image_url && !next.image_urls) {
    next.image_urls = [next.image_url];
  }
  delete next.image_url;
  delete next.end_image_url;
  delete next.size;

  return next;
}

function resolveApimartSubmitEndpoint(detail: AiStudioDocDetail) {
  if (detail.endpoint.startsWith("/v1/")) {
    return detail.endpoint;
  }

  switch (detail.category) {
    case "video":
      return "/v1/videos/generations";
    case "image":
      return "/v1/images/generations";
    default:
      throw new Error(`APIMart submission is not configured for ${detail.category} models`);
  }
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
  if (
    callbackUrl &&
    !body.callBackUrl &&
    detail.category !== "chat" &&
    vendorSupportsCallback(resolveAiStudioVendor(detail))
  ) {
    body.callBackUrl = callbackUrl;
  }

  return {
    detail,
    body,
    selectedPricing: estimatePricingRow(detail.pricingRows, body),
  };
}

export async function submitAiStudioExecution(
  detail: AiStudioDocDetail,
  body: Record<string, any>,
) {
  const vendor = resolveAiStudioVendor(detail);
  const requestBody =
    vendor === "apimart" ? buildApimartExecutionBody(detail, body) : body;
  const requestMethod = vendor === "apimart" ? "POST" : detail.method;
  const response = await fetch(
    `${getAiStudioApiBaseUrl(vendor)}${
      vendor === "apimart" ? resolveApimartSubmitEndpoint(detail) : detail.endpoint
    }`,
    {
      method: requestMethod,
      headers: {
        Authorization: `Bearer ${getAiStudioApiKey(vendor)}`,
        "Content-Type": "application/json",
      },
      body: requestMethod === "GET" ? undefined : JSON.stringify(requestBody),
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
        : raw?.msg || raw?.message || `Execution failed with ${response.status}`,
    );
  }

  const providerFailure = extractProviderFailureReason(raw);
  if (providerFailure) {
    throw new Error(providerFailure);
  }

  const taskId = extractTaskId(raw);
  const statusEndpoint = resolveStatusEndpoint(detail);

  return {
    raw,
    taskId,
    statusEndpoint,
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

  const vendor = resolveAiStudioVendor(detail);
  const url =
    vendor === "apimart"
      ? `${getAiStudioApiBaseUrl(vendor)}/v1/tasks/${encodeURIComponent(taskId)}?language=en`
      : `${getAiStudioApiBaseUrl(vendor)}${statusEndpoint}?taskId=${encodeURIComponent(taskId)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getAiStudioApiKey(vendor)}`,
    },
  });

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
