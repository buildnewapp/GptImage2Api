import type { AiStudioDocDetail } from "@/lib/ai-studio/catalog";

export type AiStudioRequestBodyType =
  | "json"
  | "form-data"
  | "x-www-form-urlencoded";

export type AiStudioTaskMode =
  | "sync"
  | "poll"
  | "callback"
  | "poll+callback";

export type AiStudioRequestMeta = {
  bodyType: AiStudioRequestBodyType;
  hiddenFields: string[];
  injectedFields: string[];
};

export type AiStudioTaskMeta = {
  mode: AiStudioTaskMode;
  statusEndpoint: string | null;
};

const CALLBACK_FIELD_NAMES = new Set([
  "callback",
  "progresscallbackurl",
  "webhookurl",
  "callbackurl",
]);

function normalizeFieldName(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function isAiStudioCallbackField(input: string) {
  return CALLBACK_FIELD_NAMES.has(normalizeFieldName(input));
}

type CallbackFieldDescriptor = {
  key: string;
  path: string[];
};

function setValueAtPath(
  source: Record<string, any>,
  path: string[],
  value: unknown,
) {
  let cursor: Record<string, any> = source;

  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index]!;
    if (!cursor[segment] || typeof cursor[segment] !== "object") {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }

  cursor[path[path.length - 1]!] = value;
}

function collectCallbackFieldDescriptors(
  schema: Record<string, any> | null,
  path: string[] = [],
): CallbackFieldDescriptor[] {
  const properties = schema?.properties;
  if (!properties || typeof properties !== "object") {
    return [];
  }

  const fields: CallbackFieldDescriptor[] = [];

  for (const [key, childSchema] of Object.entries(properties as Record<string, Record<string, any>>)) {
    const nextPath = [...path, key];

    if (isAiStudioCallbackField(key)) {
      fields.push({
        key,
        path: nextPath,
      });
    }

    if (childSchema?.properties) {
      fields.push(...collectCallbackFieldDescriptors(childSchema, nextPath));
    }

    if (childSchema?.items?.properties) {
      fields.push(...collectCallbackFieldDescriptors(childSchema.items, nextPath));
    }
  }

  return fields;
}

export function resolveStatusEndpoint<
  Detail extends Pick<AiStudioDocDetail, "docUrl" | "endpoint" | "statusEndpoint">,
>(detail: Detail) {
  if (typeof detail.statusEndpoint === "string" && detail.statusEndpoint.length > 0) {
    return detail.statusEndpoint;
  }

  const docUrl = detail.docUrl;

  if (detail.endpoint === "/api/v1/jobs/createTask" && docUrl.includes("/market/")) {
    return "/api/v1/jobs/recordInfo";
  }

  if (detail.endpoint.startsWith("/api/v1/runway/")) {
    return "/api/v1/runway/record-detail";
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

export function getAiStudioRequestMeta(
  detail: Pick<AiStudioDocDetail, "category" | "requestSchema">,
): AiStudioRequestMeta {
  const callbackFields = [
    ...new Set(
      collectCallbackFieldDescriptors(detail.requestSchema).map((field) => field.key),
    ),
  ];

  return {
    bodyType: "json",
    hiddenFields: callbackFields,
    injectedFields: detail.category === "chat" ? [] : callbackFields,
  };
}

export function resolveTaskMode<
  Detail extends Pick<
    AiStudioDocDetail,
    "category" | "requestSchema" | "docUrl" | "endpoint" | "statusEndpoint"
  >,
>(
  detail: Detail,
): AiStudioTaskMode {
  const requestMeta = getAiStudioRequestMeta(detail);
  const statusEndpoint = resolveStatusEndpoint(detail);

  if (statusEndpoint && requestMeta.injectedFields.length > 0) {
    return "poll+callback";
  }

  if (statusEndpoint) {
    return "poll";
  }

  if (requestMeta.injectedFields.length > 0) {
    return "callback";
  }

  return "sync";
}

export function getAiStudioTaskMeta(
  detail: Pick<
    AiStudioDocDetail,
    "category" | "requestSchema" | "docUrl" | "endpoint" | "statusEndpoint"
  >,
): AiStudioTaskMeta {
  return {
    mode: resolveTaskMode(detail),
    statusEndpoint: resolveStatusEndpoint(detail),
  };
}

export function applyAiStudioSystemFields<
  Detail extends Pick<AiStudioDocDetail, "category" | "requestSchema" | "vendor">,
>(
  detail: Detail,
  payload: Record<string, any>,
  callbackUrl: string | null,
) {
  const next = structuredClone(payload);

  if (!callbackUrl) {
    return next;
  }

  const callbackFieldDescriptors = collectCallbackFieldDescriptors(detail.requestSchema);
  const vendor = detail.vendor ?? "kie";

  if (callbackFieldDescriptors.length === 0) {
    if (vendor === "kie" && detail.category !== "chat" && !next.callBackUrl) {
      next.callBackUrl = callbackUrl;
    }
    return next;
  }

  for (const field of callbackFieldDescriptors) {
    let current: unknown = next;
    let hasPath = true;

    for (let index = 0; index < field.path.length - 1; index += 1) {
      const segment = field.path[index]!;
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        hasPath = false;
        break;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    if (!hasPath) {
      setValueAtPath(next, field.path, callbackUrl);
      continue;
    }

    const existingValue =
      current && typeof current === "object"
        ? (current as Record<string, unknown>)[field.path[field.path.length - 1]!]
        : undefined;

    if (existingValue === undefined || existingValue === null || existingValue === "") {
      setValueAtPath(next, field.path, callbackUrl);
    }
  }

  return next;
}
