import { AI_VIDEO_STUDIO_FAMILIES } from "@/config/ai-video-studio";

export type ApiDocParameter = {
  name: string;
  type: string;
  required: boolean;
  defaultValue: string;
  enumValues?: string[];
  descriptionKey: string;
  descriptionAnchorId?: string;
  descriptionAnchorLabelKey?: string;
};

export type ApiDocEndpoint = {
  id: string;
  method: "GET" | "POST";
  endpoint: string;
  descriptionKey: string;
  headers: string[];
  parameters: ApiDocParameter[];
  curl: string;
  responseExample: string;
  errorExample: string;
};

export type AiVideoStudioModelOption = {
  familyKey: string;
  familyLabel: string;
  versionKey: string;
  versionLabel: string;
  modelId: string;
};

export const aiVideoStudioModelOptions: AiVideoStudioModelOption[] = AI_VIDEO_STUDIO_FAMILIES.flatMap(
  (family) =>
    family.versions.map((version) => ({
      familyKey: family.key,
      familyLabel: family.label,
      versionKey: version.key,
      versionLabel: version.label,
      modelId: version.modelId,
    })),
);

export const aiVideoStudioModelIds = aiVideoStudioModelOptions.map(
  (model) => model.modelId,
);

export const apiDocStatuses = ["queued", "running", "succeeded", "failed"];

const authHeader = "Authorization: Bearer YOUR_API_KEY";
const jsonHeader = "Content-Type: application/json";

export const apiDocEndpoints: ApiDocEndpoint[] = [
  {
    id: "execute",
    method: "POST",
    endpoint: "/api/ai-studio/execute",
    descriptionKey: "endpoints.execute.description",
    headers: [authHeader, jsonHeader],
    parameters: [
      {
        name: "modelId",
        type: "string",
        required: true,
        defaultValue: "-",
        enumValues: aiVideoStudioModelIds,
        descriptionKey: "parameters.modelId",
      },
      {
        name: "isPublic",
        type: "boolean",
        required: false,
        defaultValue: "true",
        descriptionKey: "parameters.isPublic",
      },
      {
        name: "payload",
        type: "object",
        required: true,
        defaultValue: "-",
        descriptionKey: "parameters.payload",
        descriptionAnchorId: "dynamic-payload-fields-by-model",
        descriptionAnchorLabelKey: "parameters.payloadAnchor",
      },
    ],
    curl: `curl -X POST "https://YOUR_DOMAIN/api/ai-studio/execute" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "modelId": "video:sora2-text-to-video-standard",
    "isPublic": true,
    "payload": {
      "model": "video:sora2-text-to-video-standard",
      "input": {
        "prompt": "A cinematic video of a cat walking in the rain"
      }
    }
  }'`,
    responseExample: `{
  "success": true,
  "data": {
    "modelId": "video:sora2-text-to-video-standard",
    "generationId": "b6a7f5c4-8a7c-4e2b-8cf6-6b8d9b3d8d21",
    "reservedCredits": 20,
    "taskId": "provider-task-id",
    "state": "queued",
    "statusMode": "poll+callback",
    "statusSupported": true,
    "statusEndpoint": "/api/v1/jobs/recordInfo",
    "raw": {},
    "mediaUrls": [],
    "selectedPricing": {},
    "pricingRows": []
  }
}`,
    errorExample: `{
  "success": false,
  "error": "User not authenticated"
}`,
  },
  {
    id: "task",
    method: "GET",
    endpoint: "/api/ai-studio/tasks/{taskId}?modelId={modelId}",
    descriptionKey: "endpoints.task.description",
    headers: [authHeader],
    parameters: [
      {
        name: "taskId",
        type: "string",
        required: true,
        defaultValue: "-",
        descriptionKey: "parameters.taskId",
      },
      {
        name: "modelId",
        type: "string",
        required: true,
        defaultValue: "-",
        enumValues: aiVideoStudioModelIds,
        descriptionKey: "parameters.modelIdQuery",
      },
    ],
    curl: `curl -X GET "https://YOUR_DOMAIN/api/ai-studio/tasks/provider-task-id?modelId=video%3Asora2-text-to-video-standard" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    responseExample: `{
  "success": true,
  "data": {
    "generationId": "b6a7f5c4-8a7c-4e2b-8cf6-6b8d9b3d8d21",
    "taskId": "provider-task-id",
    "modelId": "video:sora2-text-to-video-standard",
    "state": "running",
    "mediaUrls": [],
    "raw": {},
    "reservedCredits": 20,
    "refundedCredits": 0
  }
}`,
    errorExample: `{
  "success": false,
  "error": "Generation record not found"
}`,
  },
  {
    id: "video-history",
    method: "GET",
    endpoint: "/api/ai-studio/video-history?page={page}&limit={limit}&status={status}&q={q}",
    descriptionKey: "endpoints.videoHistory.description",
    headers: [authHeader],
    parameters: [
      {
        name: "page",
        type: "number",
        required: false,
        defaultValue: "1",
        descriptionKey: "parameters.page",
      },
      {
        name: "limit",
        type: "number",
        required: false,
        defaultValue: "12",
        descriptionKey: "parameters.videoHistoryLimit",
      },
      {
        name: "status",
        type: "string",
        required: false,
        defaultValue: "all",
        enumValues: ["all", "pending", "success", "failed"],
        descriptionKey: "parameters.historyStatus",
      },
      {
        name: "q",
        type: "string",
        required: false,
        defaultValue: "\"\"",
        descriptionKey: "parameters.q",
      },
    ],
    curl: `curl -X GET "https://YOUR_DOMAIN/api/ai-studio/video-history?page=1&limit=12&status=all" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    responseExample: `{
  "success": true,
  "data": {
    "records": [],
    "total": 0,
    "totalPages": 1,
    "page": 1
  }
}`,
    errorExample: `{
  "success": false,
  "error": "Failed to load AI Studio generation history"
}`,
  },
  {
    id: "user",
    method: "GET",
    endpoint: "/api/auth/user",
    descriptionKey: "endpoints.user.description",
    headers: [authHeader],
    parameters: [],
    curl: `curl -X GET "https://YOUR_DOMAIN/api/auth/user" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    responseExample: `{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "developer@example.com",
      "role": "user",
      "name": "Developer",
      "image": null,
      "authType": "apikey"
    },
    "credits": 120,
    "membership": {
      "isVip": false,
      "level": "none",
      "planTitle": null
    }
  }
}`,
    errorExample: `{
  "success": false,
  "error": "User not authenticated"
}`,
  },
];
