/**
 * GET /api/video/status?taskId=xxx
 *
 * 查询视频生成任务状态。
 * 如果 pending，同步从 KIE 拉取最新状态并更新。
 * 如果变为 failed 且未退积分，自动退还。
 */

import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { getDb } from "@/lib/db";
import { videoGenerations } from "@/lib/db/schema";
import { parseResultJson, queryTaskStatus } from "@/lib/kie/client";
import { refundCreditsForGeneration } from "@/lib/kie/credits";
import { ensureVideoResultUrlsUploadedToR2 } from "@/lib/video/r2-auto-upload";
import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // 1. 认证
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    // 2. 获取 taskId
    const taskId = request.nextUrl.searchParams.get("taskId");
    if (!taskId) {
      return apiResponse.badRequest("Missing 'taskId' parameter.");
    }

    // 3. 查询数据库记录（确保属于当前用户）
    const [record] = await getDb()
      .select()
      .from(videoGenerations)
      .where(
        and(
          eq(videoGenerations.taskId, taskId),
          eq(videoGenerations.userId, user.id),
        ),
      )
      .limit(1);

    if (!record) {
      return apiResponse.notFound("Generation record not found.");
    }

    // 4. 如果还是 pending，从 KIE 同步最新状态
    if (record.status === "pending") {
      try {
        const kieResult = await queryTaskStatus(taskId, record.model);
        const taskData = kieResult.data;

        if (taskData.state === "success") {
          const parsed = parseResultJson(taskData.resultJson);
          const rawResultUrls = parsed?.resultUrls ?? [];
          await getDb()
            .update(videoGenerations)
            .set({
              status: "success",
              resultUrls: rawResultUrls,
              costTime: taskData.costTime,
              completedAt: taskData.completeTime
                ? new Date(taskData.completeTime)
                : new Date(),
            })
            .where(eq(videoGenerations.id, record.id));

          let resultUrls = rawResultUrls;
          let uploadingToR2 = false;
          try {
            const autoUploadResult = await ensureVideoResultUrlsUploadedToR2(
              record.id,
              rawResultUrls,
            );
            resultUrls = autoUploadResult.resultUrls;
            uploadingToR2 = autoUploadResult.uploading;
          } catch (uploadErr) {
            console.error(
              "Failed to auto-upload task assets to R2 in status route:",
              uploadErr,
            );
          }

          if (uploadingToR2) {
            return apiResponse.success({
              taskId: record.taskId,
              status: "pending",
              creditsUsed: record.creditsUsed,
              createdAt: record.createdAt,
              uploadingToR2: true,
            });
          }

          return apiResponse.success({
            taskId: record.taskId,
            status: "success",
            resultUrls,
            creditsUsed: record.creditsUsed,
            costTime: taskData.costTime,
            createdAt: record.createdAt,
          });
        }

        if (taskData.state === "fail") {
          // 更新失败状态
          await getDb()
            .update(videoGenerations)
            .set({
              status: "failed",
              failCode: taskData.failCode,
              failMsg: taskData.failMsg,
              completedAt: new Date(),
            })
            .where(eq(videoGenerations.id, record.id));

          // 退还积分
          if (!record.creditsRefunded) {
            try {
              await refundCreditsForGeneration(
                record.userId,
                record.creditsUsed,
                `Refund: ${record.model} generation failed (${taskData.failCode})`,
              );
              await getDb()
                .update(videoGenerations)
                .set({ creditsRefunded: true })
                .where(eq(videoGenerations.id, record.id));
            } catch (refundErr) {
              console.error(
                "Failed to refund credits for failed task:",
                refundErr,
              );
            }
          }

          return apiResponse.success({
            taskId: record.taskId,
            status: "failed",
            failCode: taskData.failCode,
            failMsg: taskData.failMsg,
            creditsUsed: record.creditsUsed,
            creditsRefunded: true,
            createdAt: record.createdAt,
          });
        }

        // 仍在等待
        return apiResponse.success({
          taskId: record.taskId,
          status: "pending",
          creditsUsed: record.creditsUsed,
          createdAt: record.createdAt,
        });
      } catch (kieErr: any) {
        console.error("Error querying KIE task status:", kieErr.message);
        // KIE 查询失败，返回数据库中的当前状态
        return apiResponse.success({
          taskId: record.taskId,
          status: record.status,
          creditsUsed: record.creditsUsed,
          createdAt: record.createdAt,
        });
      }
    }

    // 5. 已完成的任务，直接返回数据库记录
    let resultUrls = Array.isArray(record.resultUrls)
      ? (record.resultUrls as string[])
      : [];
    let uploadingToR2 = false;
    if (record.status === "success") {
      try {
        const autoUploadResult = await ensureVideoResultUrlsUploadedToR2(
          record.id,
          record.resultUrls,
        );
        resultUrls = autoUploadResult.resultUrls;
        uploadingToR2 = autoUploadResult.uploading;
      } catch (uploadErr) {
        console.error(
          "Failed to auto-upload stored assets to R2 in status route:",
          uploadErr,
        );
      }

      if (uploadingToR2) {
        return apiResponse.success({
          taskId: record.taskId,
          status: "pending",
          creditsUsed: record.creditsUsed,
          createdAt: record.createdAt,
          uploadingToR2: true,
        });
      }
    }

    return apiResponse.success({
      taskId: record.taskId,
      status: record.status,
      resultUrls,
      failCode: record.failCode,
      failMsg: record.failMsg,
      creditsUsed: record.creditsUsed,
      creditsRefunded: record.creditsRefunded,
      costTime: record.costTime,
      completedAt: record.completedAt,
      createdAt: record.createdAt,
    });
  } catch (err: any) {
    console.error("Error in GET /api/video/status:", err);
    return apiResponse.serverError(err.message || "Internal server error");
  }
}
