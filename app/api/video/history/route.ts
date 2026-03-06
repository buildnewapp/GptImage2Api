/**
 * GET /api/video/history?page=0&pageSize=20
 *
 * 获取当前用户的视频生成历史记录。
 */

import { apiResponse } from "@/lib/api-response";
import { getRequestUser } from "@/lib/auth/request-user";
import { db } from "@/lib/db";
import { videoGenerations } from "@/lib/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // 1. 认证
    const user = await getRequestUser(request);
    if (!user) {
      return apiResponse.unauthorized();
    }

    // 2. 分页参数
    const page = parseInt(
      request.nextUrl.searchParams.get("page") || "0",
      10,
    );
    const pageSize = Math.min(
      parseInt(request.nextUrl.searchParams.get("pageSize") || "20", 10),
      100,
    );

    const whereClause = eq(videoGenerations.userId, user.id);

    // 3. 并发查询数据和总数
    const [records, totalResult] = await Promise.all([
      db
        .select({
          id: videoGenerations.id,
          taskId: videoGenerations.taskId,
          model: videoGenerations.model,
          status: videoGenerations.status,
          creditsUsed: videoGenerations.creditsUsed,
          creditsRefunded: videoGenerations.creditsRefunded,
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
        .offset(page * pageSize)
        .limit(pageSize),
      db
        .select({ value: count() })
        .from(videoGenerations)
        .where(whereClause),
    ]);

    return apiResponse.success({
      records,
      total: totalResult[0]?.value ?? 0,
      page,
      pageSize,
    });
  } catch (err: any) {
    console.error("Error in GET /api/video/history:", err);
    return apiResponse.serverError(err.message || "Internal server error");
  }
}
