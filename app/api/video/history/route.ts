/**
 * GET /api/video/history?page=1&limit=12&status=all
 *
 * 获取当前用户的视频生成历史记录。
 */

import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { getDb } from "@/lib/db";
import { videoGenerations } from "@/lib/db/schema";
import { VIDEO_MODEL_FAMILIES, findImplementationByModelId } from "@/config/model_config";
import { and, count, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

type GenerationMode = "image-to-video" | "text-to-video";

type ProviderValues = {
  prompt?: string;
  imageUrl?: string;
  resolution?: string;
  aspectRatio?: string;
  duration?: string;
  seed?: string;
  cameraFixed?: boolean;
  enableSafetyChecker?: boolean;
};

function resolveModelLabels(model: string, inputParams: unknown) {
  const selection = (inputParams as any)?.selection;
  const modelKey =
    typeof selection?.modelKey === "string" ? selection.modelKey : null;
  const versionKey =
    typeof selection?.versionKey === "string" ? selection.versionKey : null;

  if (modelKey) {
    const family = VIDEO_MODEL_FAMILIES.find((item) => item.modelKey === modelKey);
    if (family) {
      if (versionKey) {
        const version = family.versions.find(
          (item) => item.versionKey === versionKey,
        );
        if (version) {
          return {
            modelLabel: family.displayName,
            versionLabel: version.displayName,
            modelKey,
            versionKey,
          };
        }
      }
      return {
        modelLabel: family.displayName,
        versionLabel: family.displayName,
        modelKey,
        versionKey: null,
      };
    }
    return {
      modelLabel: modelKey,
      versionLabel: modelKey,
      modelKey,
      versionKey: versionKey || null,
    };
  }

  const resolved = findImplementationByModelId(model);
  if (resolved) {
    return {
      modelLabel: resolved.family.displayName,
      versionLabel: resolved.version.displayName,
      modelKey: resolved.family.modelKey,
      versionKey: resolved.version.versionKey,
    };
  }

  const fallback = model.includes("/") ? model.split("/").at(-1) || model : model;
  return {
    modelLabel: fallback,
    versionLabel: fallback,
    modelKey: null,
    versionKey: null,
  };
}

function resolveMode(inputParams: unknown): GenerationMode {
  const selectionMode = (inputParams as any)?.selection?.mode;
  if (selectionMode === "image-to-video" || selectionMode === "text-to-video") {
    return selectionMode;
  }

  const inputPayload = (inputParams as any)?.input;
  if (typeof inputPayload?.image_url === "string" && inputPayload.image_url.trim()) {
    return "image-to-video";
  }
  return "text-to-video";
}

function resolveProviderValues(inputParams: unknown): ProviderValues {
  const inputPayload = (inputParams as any)?.input ?? {};
  const prompt =
    typeof inputPayload.prompt === "string" ? inputPayload.prompt : undefined;
  const imageUrl =
    typeof inputPayload.image_url === "string" ? inputPayload.image_url : undefined;
  const resolution =
    typeof inputPayload.resolution === "string" ? inputPayload.resolution : undefined;
  const aspectRatio =
    typeof inputPayload.aspect_ratio === "string"
      ? inputPayload.aspect_ratio
      : typeof inputPayload.aspectRatio === "string"
        ? inputPayload.aspectRatio
        : undefined;
  const duration =
    typeof inputPayload.duration === "string" ? inputPayload.duration : undefined;
  const seedRaw = inputPayload.seed;
  const seed =
    typeof seedRaw === "string" || typeof seedRaw === "number"
      ? String(seedRaw)
      : undefined;
  const cameraFixed =
    typeof inputPayload.camera_fixed === "boolean"
      ? inputPayload.camera_fixed
      : undefined;
  const enableSafetyChecker =
    typeof inputPayload.enable_safety_checker === "boolean"
      ? inputPayload.enable_safety_checker
      : undefined;

  return {
    prompt,
    imageUrl,
    resolution,
    aspectRatio,
    duration,
    seed,
    cameraFixed,
    enableSafetyChecker,
  };
}

export async function GET(request: NextRequest) {
  try {
    // 1. 认证
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    // 2. 分页参数
    const rawPage = Number.parseInt(
      request.nextUrl.searchParams.get("page") || "1",
      10,
    );
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

    const rawLimit = Number.parseInt(
      request.nextUrl.searchParams.get("limit") ||
        request.nextUrl.searchParams.get("pageSize") ||
        "12",
      10,
    );
    const pageSize =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, 100)
        : 12;

    const status = request.nextUrl.searchParams.get("status");

    const conditions = [eq(videoGenerations.userId, user.id)];
    if (status && status !== "all") {
      if (!["pending", "success", "failed"].includes(status)) {
        return apiResponse.badRequest("Invalid status parameter.");
      }
      conditions.push(eq(videoGenerations.status, status as any));
    }

    const whereClause = and(...conditions);

    // 3. 并发查询数据和总数
    const [rawRecords, totalResult] = await Promise.all([
      getDb()
        .select({
          id: videoGenerations.id,
          taskId: videoGenerations.taskId,
          model: videoGenerations.model,
          status: videoGenerations.status,
          isPublic: videoGenerations.isPublic,
          creditsUsed: videoGenerations.creditsUsed,
          creditsRefunded: videoGenerations.creditsRefunded,
          inputParams: videoGenerations.inputParams,
          resultUrls: videoGenerations.resultUrls,
          failCode: videoGenerations.failCode,
          failMsg: videoGenerations.failMsg,
          costTime: videoGenerations.costTime,
          completedAt: videoGenerations.completedAt,
          createdAt: videoGenerations.createdAt,
        })
        .from(videoGenerations)
        .where(whereClause)
        .orderBy(desc(videoGenerations.createdAt))
        .offset((page - 1) * pageSize)
        .limit(pageSize),
      getDb()
        .select({ value: count() })
        .from(videoGenerations)
        .where(whereClause),
    ]);

    const records = rawRecords.map((record) => {
      const labels = resolveModelLabels(record.model, record.inputParams);
      const selection = (record.inputParams as any)?.selection;
      const inputPayload = (record.inputParams as any)?.input || {};
      const prompt =
        typeof inputPayload.prompt === "string"
          ? inputPayload.prompt
          : typeof inputPayload.text === "string"
            ? inputPayload.text
            : null;
      const resultUrls = Array.isArray(record.resultUrls)
        ? (record.resultUrls as string[])
        : [];

      return {
        ...labels,
        id: record.id,
        taskId: record.taskId,
        model: record.model,
        modelDisplay: labels.versionLabel,
        mode: resolveMode(record.inputParams),
        providerKey:
          typeof selection?.providerKey === "string"
            ? selection.providerKey
            : null,
        providerValues: resolveProviderValues(record.inputParams),
        status: record.status,
        isPublic: record.isPublic,
        creditsUsed: record.creditsUsed,
        creditsRequired: record.creditsUsed,
        creditsRefunded: record.creditsRefunded,
        prompt,
        uploadedImage:
          typeof inputPayload.image_url === "string" ? inputPayload.image_url : null,
        resultUrl: resultUrls[0] ?? null,
        resultUrls,
        failCode: record.failCode,
        failMsg: record.failMsg,
        costTime: record.costTime,
        completedAt: record.completedAt,
        createdAt:
          record.createdAt instanceof Date
            ? record.createdAt.toISOString()
            : record.createdAt,
      };
    });

    const total = Number(totalResult[0]?.value ?? 0);

    return apiResponse.success({
      records,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      page,
      pageSize,
    });
  } catch (err: any) {
    console.error("Error in GET /api/video/history:", err);
    return apiResponse.serverError(err.message || "Internal server error");
  }
}

/**
 * PATCH /api/video/history
 *
 * 切换当前用户某条视频记录的可见性。
 * body: { id: string, isPublic: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id : "";
    const isPublic =
      typeof body?.isPublic === "boolean" ? body.isPublic : null;

    if (!id || typeof isPublic !== "boolean") {
      return apiResponse.badRequest("Invalid payload. Require id and isPublic.");
    }

    const [updated] = await getDb()
      .update(videoGenerations)
      .set({
        isPublic,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(videoGenerations.id, id),
          eq(videoGenerations.userId, user.id),
        ),
      )
      .returning({
        id: videoGenerations.id,
        isPublic: videoGenerations.isPublic,
      });

    if (!updated) {
      return apiResponse.notFound("Video generation record not found.");
    }

    return apiResponse.success(updated);
  } catch (err: any) {
    console.error("Error in PATCH /api/video/history:", err);
    return apiResponse.serverError(err.message || "Internal server error");
  }
}
