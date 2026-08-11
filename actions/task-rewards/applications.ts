"use server";

import { siteConfig } from "@/config/site";
import { isRedditManualReviewTaskKey } from "@/config/task-rewards";
import { actionResponse, type ActionResult } from "@/lib/action-response";
import { getSession } from "@/lib/auth/server";
import {
  type ManualTaskApplicationActionResult,
  mapManualTaskApplicationResult,
  parseManualTaskApplicationInput,
} from "@/lib/task-rewards/application-action";
import { submitManualRewardApplication } from "@/lib/task-rewards/applications";
import { createDrizzleRewardApplicationStore } from "@/lib/task-rewards/drizzle-application-store";

type SubmittedManualTaskApplication = Extract<
  ManualTaskApplicationActionResult,
  { success: true }
>["data"];

const redditTaskLabels = {
  share_reddit_website: "分享网站",
  share_reddit_work: "分享作品",
  reddit_post_popular: "帖子热门奖励",
} as const;

async function sendRedditTaskWeComNotification({
  applicationId,
  taskKey,
  creditAmount,
  submissionText,
  user,
}: {
  applicationId: string;
  taskKey: keyof typeof redditTaskLabels;
  creditAmount: number;
  submissionText: string;
  user: { id: string; name?: string | null; email?: string | null };
}) {
  const webhookKey = process.env.WECOM_MSG_WEBHOOK_KEY;
  if (!webhookKey) {
    console.error("WECOM_MSG_WEBHOOK_KEY is not configured");
    return;
  }

  try {
    const userText = [user.name, user.email, user.id].filter(Boolean).join(" / ");
    const submittedAt = new Date().toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
    });
    const adminUrl = `${siteConfig.url.replace(/\/$/, "")}/dashboard/task-rewards-admin`;
    const content = [
      `${siteConfig.name} Reddit 任务待审核`,
      `时间: ${submittedAt}`,
      `用户: ${userText}`,
      `任务: ${redditTaskLabels[taskKey]} (${taskKey})`,
      `奖励: ${creditAmount} 积分`,
      `帖子链接: ${submissionText}`,
      `申请 ID: ${applicationId}`,
      `审核地址: ${adminUrl}`,
    ].join("\n");

    const response = await fetch(
      `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${webhookKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          msgtype: "text",
          text: {
            content,
          },
        }),
      },
    );
    const body = await response.json().catch(() => ({}));

    if (!response.ok || body?.errcode !== 0) {
      console.error("send wecom reddit task notification failed:", body);
    }
  } catch (error) {
    console.error("send wecom reddit task notification failed:", error);
  }
}

export async function submitManualTaskApplicationAction(
  input: unknown,
): Promise<ActionResult<SubmittedManualTaskApplication>> {
  const parsed = parseManualTaskApplicationInput(input);
  if (!parsed.success) {
    return actionResponse.badRequest(
      "Invalid task application.",
      parsed.customCode,
    );
  }

  const session = await getSession();
  const user = session?.user;
  if (!user) return actionResponse.unauthorized();

  try {
    const result = await submitManualRewardApplication({
      store: createDrizzleRewardApplicationStore(),
      userId: user.id,
      taskKey: parsed.data.taskKey,
      evidenceKey: parsed.data.evidenceKey,
      submissionText: parsed.data.submissionText,
    });

    if (
      result.status === "submitted" &&
      isRedditManualReviewTaskKey(parsed.data.taskKey)
    ) {
      await sendRedditTaskWeComNotification({
        applicationId: result.applicationId,
        taskKey: parsed.data.taskKey,
        creditAmount: result.creditAmount,
        submissionText: parsed.data.submissionText,
        user,
      });
    }

    return mapManualTaskApplicationResult(result, parsed.data.taskKey);
  } catch (error) {
    console.error("Error submitting manual task application", error);
    return actionResponse.error(
      "Unable to submit the task application. Please try again later.",
      "application_submission_failed",
    );
  }
}
