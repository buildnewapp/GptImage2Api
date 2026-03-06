/**
 * POST /api/video/generate
 *
 * 创建视频生成任务。
 * 流程：认证 → 校验模型 → 检查余额 → 扣积分 → 调 KIE → 存数据库
 */

import { getModelCredits, VALID_MODELS } from "@/config/video-generation";
import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { db } from "@/lib/db";
import { videoGenerations } from "@/lib/db/schema";
import { createTask, getCallbackUrl } from "@/lib/kie/client";
import {
  deductCreditsForGeneration,
  refundCreditsForGeneration,
} from "@/lib/kie/credits";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. 认证
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    // 2. 解析请求
    const body = await request.json();
    const { model, input } = body;

    if (!model || typeof model !== "string") {
      return apiResponse.badRequest("Missing or invalid 'model' parameter.");
    }

    if (!input || typeof input !== "object") {
      return apiResponse.badRequest("Missing or invalid 'input' parameter.");
    }

    // 3. 校验模型
    if (!VALID_MODELS.includes(model)) {
      return apiResponse.badRequest(
        `Invalid model '${model}'. Valid models: ${VALID_MODELS.join(", ")}`,
      );
    }

    // 4. 获取积分消耗
    const creditsRequired = getModelCredits(model)!;

    // 5. 扣除积分
    try {
      await deductCreditsForGeneration(
        user.id,
        creditsRequired,
        `Video generation: ${model}`,
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
        model,
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
          `Refund: KIE createTask failed for ${model}`,
        );
      } catch (refundErr) {
        console.error("Failed to refund credits after KIE error:", refundErr);
      }
      return apiResponse.serverError(
        `Failed to create video generation task: ${err.message}`,
      );
    }

    // 7. 存储生成记录
    const [record] = await db
      .insert(videoGenerations)
      .values({
        userId: user.id,
        taskId,
        model,
        creditsUsed: creditsRequired,
        inputParams: { model, input },
      })
      .returning({
        id: videoGenerations.id,
        taskId: videoGenerations.taskId,
        model: videoGenerations.model,
        status: videoGenerations.status,
        creditsUsed: videoGenerations.creditsUsed,
        createdAt: videoGenerations.createdAt,
      });

    return apiResponse.success({
      taskId,
      generationId: record.id,
      model: record.model,
      status: record.status,
      creditsUsed: record.creditsUsed,
      createdAt: record.createdAt,
    });
  } catch (err: any) {
    console.error("Error in POST /api/video/generate:", err);
    return apiResponse.serverError(err.message || "Internal server error");
  }
}
