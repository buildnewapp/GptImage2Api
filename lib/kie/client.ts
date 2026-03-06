/**
 * KIE API Client
 *
 * 封装 KIE 平台的 createTask 和 recordInfo 接口。
 * 所有 12 个视频生成模型共享同一组 API 端点。
 */

const KIE_API_BASE = "https://api.kie.ai";

function getApiKey(): string {
  const key = process.env.KIE_API_KEY;
  if (!key) {
    throw new Error("KIE_API_KEY environment variable is not set");
  }
  return key;
}

// ── Types ──

export interface CreateTaskRequest {
  model: string;
  input: Record<string, unknown>;
  callBackUrl?: string;
}

export interface CreateTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

export interface TaskStatusData {
  taskId: string;
  model: string;
  state: "waiting" | "success" | "fail";
  param: string;
  resultJson: string | null;
  failCode: string | null;
  failMsg: string | null;
  costTime: number | null;
  completeTime: number | null;
  createTime: number;
}

export interface QueryTaskResponse {
  code: number;
  msg: string;
  data: TaskStatusData;
}

export interface ParsedResult {
  resultUrls?: string[];
  resultObject?: Record<string, unknown>;
}

// ── API Functions ──

/**
 * 创建视频生成任务
 */
export async function createTask(
    request: CreateTaskRequest,
): Promise<CreateTaskResponse> {

  const isVeo = request.model === "veo3" || request.model === "veo3_fast";
  const endpoint = isVeo
      ? `${KIE_API_BASE}/api/v1/veo/generate`
      : `${KIE_API_BASE}/api/v1/jobs/createTask`;

  const payload = isVeo
      ? { model: request.model, callBackUrl: request.callBackUrl, ...request.input }
      : request;

  console.log("kie createTask", endpoint, payload);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(
        `KIE API createTask failed (${res.status}): ${text}`,
    );
  }

  const json: CreateTaskResponse = await res.json();

  if (json.code !== 200) {
    throw new Error(
        `KIE API createTask error (code ${json.code}): ${json.msg}`,
    );
  }

  return json;
}

/**
 * 查询任务状态
 */
export async function queryTaskStatus(
    taskId: string,
    model?: string,
): Promise<QueryTaskResponse> {
  const isVeo = model === "veo3" || model === "veo3_fast";
  let url = `${KIE_API_BASE}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;

  if (isVeo) {
    url = `${KIE_API_BASE}/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`;
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(
        `KIE API queryTaskStatus failed (${res.status}): ${text}`,
    );
  }

  const json: any = await res.json();

  if (json.code !== 200) {
    throw new Error(
        `KIE API queryTaskStatus error (code ${json.code}): ${json.msg}`,
    );
  }

  if (isVeo && json.data) {
    const veoData = json.data;
    let state: "waiting" | "success" | "fail" = "waiting";
    if (veoData.successFlag === 1) state = "success";
    else if (veoData.successFlag === 2 || veoData.successFlag === 3) state = "fail";

    const standardData: TaskStatusData = {
      taskId: veoData.taskId || taskId,
      model: model || "veo",
      state: state,
      param: veoData.paramJson || "",
      resultJson: veoData.response ? JSON.stringify(veoData.response) : null,
      failCode: veoData.errorCode ? String(veoData.errorCode) : null,
      failMsg: veoData.errorMessage || null,
      costTime: veoData.completeTime && veoData.createTime ? (veoData.completeTime - veoData.createTime) : null,
      completeTime: veoData.completeTime || null,
      createTime: veoData.createTime || Date.now(),
    };
    json.data = standardData;
  }

  console.log('kie queryTaskStatus', url, model, taskId, JSON.stringify(json));
  return json as QueryTaskResponse;
}

/**
 * 解析 resultJson 字符串
 */
export function parseResultJson(resultJson: string | null): ParsedResult | null {
  if (!resultJson) return null;
  try {
    return JSON.parse(resultJson) as ParsedResult;
  } catch {
    console.error("Failed to parse KIE resultJson:", resultJson);
    return null;
  }
}

/**
 * 获取回调 URL
 */
export function getCallbackUrl(): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.KIE_CALLBACK_SECRET;
  if (!appUrl || !secret) return undefined;
  return `${appUrl}/api/video/callback?secret=${encodeURIComponent(secret)}`;
}
