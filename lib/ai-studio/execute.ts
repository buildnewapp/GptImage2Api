import {
  type AiStudioDocDetail,
  type AiStudioPricingRow,
  extractPricingAnchorModel,
  getCachedAiStudioCatalogDetail,
  normalizeModelHandle,
} from "@/lib/ai-studio/catalog";

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

export function resolveStatusEndpoint(detail: AiStudioDocDetail) {
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

  function visit(value: unknown) {
    if (!value) {
      return;
    }

    if (typeof value === "string") {
      if (/^https?:\/\//.test(value)) {
        urls.add(value);
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

export function normalizeTaskState(raw: unknown): AiStudioNormalizedState {
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
  if (pricingRows.length <= 1) {
    return pricingRows[0] ?? null;
  }

  const payloadText = JSON.stringify(payload).toLowerCase();
  const payloadModel =
    typeof payload.model === "string" ? normalizeModelHandle(payload.model) : "";
  let bestRow: AiStudioPricingRow | null = null;
  let bestScore = -1;

  for (const row of pricingRows) {
    const anchorModel = normalizeModelHandle(extractPricingAnchorModel(row.anchor));
    const tokens = row.modelDescription
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 2);

    let score = 0;
    if (payloadModel) {
      if (anchorModel === payloadModel) {
        score += 50;
      } else if (anchorModel.startsWith(`${payloadModel}-`)) {
        score += 25;
      } else if (anchorModel) {
        score -= 10;
      }
    }

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

export async function prepareAiStudioExecution(
  modelId: string,
  payload: Record<string, any>,
) {
  const detail = await getCachedAiStudioCatalogDetail(modelId);
  if (!detail) {
    throw new Error("Unknown model");
  }

  const body = structuredClone(payload);
  const callbackUrl = getAiStudioCallbackUrl();
  if (callbackUrl && !body.callBackUrl && detail.category !== "chat") {
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
  const detail = await getCachedAiStudioCatalogDetail(modelId);
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
