/**
 * POST /api/video/generate
 *
 * 创建视频生成任务。
 * 流程：认证 → 校验模型 → 检查余额 → 扣积分 → 调 KIE → 存数据库
 */

import {
  calculateCreditsForImplementation,
  findImplementationByModelId,
  resolveSelection,
  type GenerationMode,
  type ProviderKey,
  type VideoInputPayload,
} from "@/config/model_config";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { getDb } from "@/lib/db";
import { videoGenerations } from "@/lib/db/schema";
import { createTask, getCallbackUrl } from "@/lib/kie/client";
import {
  deductCreditsForGeneration,
  refundCreditsForGeneration,
} from "@/lib/kie/credits";
import { NextRequest } from "next/server";

function inferModeFromInput(input: VideoInputPayload): GenerationMode {
  return input.image_url ? "image-to-video" : "text-to-video";
}

export async function POST(request: NextRequest) {
  try {
    // 1. 认证
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    // 2. 解析请求
    const body = await request.json();
    const input = body?.input;
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return apiResponse.badRequest("Missing or invalid 'input' parameter.");
    }

    const providerKey =
      typeof body?.providerKey === "string"
        ? (body.providerKey as ProviderKey)
        : undefined;
    const modelKey =
      typeof body?.modelKey === "string" ? body.modelKey : undefined;
    const versionKey =
      typeof body?.versionKey === "string" ? body.versionKey : undefined;
    const mode =
      typeof body?.mode === "string"
        ? (body.mode as GenerationMode)
        : inferModeFromInput(input);
    const isPublic =
      typeof body?.isPublic === "boolean" ? body.isPublic : true;

    let resolved =
      providerKey && modelKey
        ? resolveSelection({
          providerKey,
          modelKey,
          versionKey,
          mode,
        })
        : null;

    if (!resolved) {
      return apiResponse.badRequest(
        "Invalid model selection. Please provide valid providerKey/modelKey/versionKey.",
      );
    }

    const creditsRequired = calculateCreditsForImplementation(
      resolved.implementation,
      input,
    );
    if (!creditsRequired || creditsRequired <= 0) {
      return apiResponse.badRequest(
        "Unable to calculate credits for current model settings.",
      );
    }

    // 5. 扣除积分
    try {
      await deductCreditsForGeneration(
        user.id,
        creditsRequired,
        `Video generation: ${resolved.implementation.modelId}`,
      );
    } catch (err: any) {
      if (err.message === "INSUFFICIENT_CREDITS") {
        return apiResponse.error(
          `Insufficient credits. This model requires ${creditsRequired} credits.`,
          402,
        );
      }
      throw err;
    }

    // 6. 调用 KIE API
    let taskId: string;
    try {
      const callBackUrl = getCallbackUrl();
      const result = await createTask({
        model: resolved.implementation.modelId,
        input,
        callBackUrl,
      });
      taskId = result.data.taskId;
    } catch (err: any) {
      // KIE 调用失败，退还积分
      console.error("KIE createTask failed, refunding credits:", err.message);
      try {
        await refundCreditsForGeneration(
          user.id,
          creditsRequired,
          `Refund: KIE createTask failed for ${resolved.implementation.modelId}`,
        );
      } catch (refundErr) {
        console.error("Failed to refund credits after KIE error:", refundErr);
      }
      return apiResponse.serverError(
        `Failed to create video generation task: ${err.message}`,
      );
    }

    // 7. 存储生成记录
    const [record] = await getDb()
      .insert(videoGenerations)
      .values({
        userId: user.id,
        taskId,
        model: resolved.implementation.modelId,
        creditsUsed: creditsRequired,
        isPublic,
        inputParams: {
          input,
          metadata: {
            isPublic,
          },
          selection: {
            mode: resolved.implementation.mode,
            providerKey: resolved.implementation.providerKey,
            modelKey: resolved.family.modelKey,
            versionKey: resolved.version.versionKey,
            modelId: resolved.implementation.modelId,
            doc: resolved.implementation.doc ?? null,
          },
        },
      })
      .returning({
        id: videoGenerations.id,
        taskId: videoGenerations.taskId,
        model: videoGenerations.model,
        status: videoGenerations.status,
        creditsUsed: videoGenerations.creditsUsed,
        isPublic: videoGenerations.isPublic,
        createdAt: videoGenerations.createdAt,
      });

    return apiResponse.success({
      taskId,
      generationId: record.id,
      status: record.status,
      creditsUsed: record.creditsUsed,
      isPublic: record.isPublic,
      createdAt: record.createdAt,
    });
  } catch (err: any) {
    console.error("Error in POST /api/video/generate:", err);
    return apiResponse.serverError(err.message || "Internal server error");
  }
}
