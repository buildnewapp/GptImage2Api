/**
 * POST /api/video/callback?secret=xxx
 *
 * KIE 回调处理端点（无需用户认证）。
 * KIE 在任务完成或失败时主动推送结果到此端点。
 * 通过 query param `secret` 验证请求来源。
 */

import { apiResponse } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { videoGenerations } from "@/lib/db/schema";
import { parseResultJson } from "@/lib/kie/client";
import { refundCreditsForGeneration } from "@/lib/kie/credits";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. 验证回调密钥
    const secret = request.nextUrl.searchParams.get("secret");
    const expectedSecret = process.env.KIE_CALLBACK_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return apiResponse.unauthorized("Invalid callback secret.");
    }

    // 2. 解析回调数据（格式和 queryTaskStatus 的 response 一致）
    const body = await request.json();
    const taskData = body.data ?? body;

    const taskId = taskData.taskId;
    if (!taskId) {
      return apiResponse.badRequest("Missing taskId in callback data.");
    }

    // 3. 查找生成记录
    const [record] = await getDb()
      .select()
      .from(videoGenerations)
      .where(eq(videoGenerations.taskId, taskId))
      .limit(1);

    if (!record) {
      console.warn(`Callback received for unknown taskId: ${taskId}`);
      return apiResponse.notFound("Generation record not found.");
    }

    const isVeo = record.model === "veo3" || record.model === "veo3_fast";

    let state: string = taskData.state;
    if (isVeo) {
      if (taskData.successFlag === 1) state = "success";
      else if (taskData.successFlag === 2 || taskData.successFlag === 3) state = "fail";
      else state = "waiting";
    }

    if (!state || !["success", "fail"].includes(state)) {
      // waiting 状态不需要处理
      return apiResponse.success({ message: "Ignored non-terminal state." });
    }

    // 4. 如果已经处理过，直接返回
    if (record.status !== "pending") {
      return apiResponse.success({
        message: "Task already processed.",
        status: record.status,
      });
    }

    // 5. 处理成功
    if (state === "success") {
      const resultJson = isVeo && taskData.response ? JSON.stringify(taskData.response) : taskData.resultJson;
      const parsed = parseResultJson(resultJson);
      await getDb()
        .update(videoGenerations)
        .set({
          status: "success",
          resultUrls: parsed?.resultUrls ?? [],
          costTime: taskData.costTime ?? null,
          completedAt: taskData.completeTime
            ? new Date(taskData.completeTime)
            : new Date(),
        })
        .where(eq(videoGenerations.id, record.id));

      return apiResponse.success({
        message: "Task completed successfully.",
        taskId,
        status: "success",
      });
    }

    // 6. 处理失败 + 退积分
    if (state === "fail") {
      const failCode = isVeo ? String(taskData.errorCode) : taskData.failCode;
      const failMsg = isVeo ? taskData.errorMessage : taskData.failMsg;

      await getDb()
        .update(videoGenerations)
        .set({
          status: "failed",
          failCode: failCode ?? null,
          failMsg: failMsg ?? null,
          completedAt: new Date(),
        })
        .where(eq(videoGenerations.id, record.id));

      // 退还积分
      if (!record.creditsRefunded) {
        try {
          await refundCreditsForGeneration(
            record.userId,
            record.creditsUsed,
            `Refund: ${record.model} generation failed via callback (${failCode ?? "unknown"})`,
          );
          await getDb()
            .update(videoGenerations)
            .set({ creditsRefunded: true })
            .where(eq(videoGenerations.id, record.id));
        } catch (refundErr) {
          console.error(
            "Failed to refund credits in callback handler:",
            refundErr,
          );
        }
      }

      return apiResponse.success({
        message: "Task failed, credits refunded.",
        taskId,
        status: "failed",
      });
    }

    return apiResponse.success({ message: "No action taken." });
  } catch (err: any) {
    console.error("Error in POST /api/video/callback:", err);
    return apiResponse.serverError(err.message || "Internal server error");
  }
}
