"use server";

import { manualReviewTasks, taskRewardsConfig } from "@/config/task-rewards";
import { actionResponse, type ActionResult } from "@/lib/action-response";
import { getSession } from "@/lib/auth/server";
import { createTaskEvidencePresignedUploadUrl } from "@/lib/cloudflare/task-evidence-r2";
import {
  prepareTaskEvidenceUpload,
  taskEvidenceUploadInputSchema,
} from "@/lib/task-rewards/evidence";
import { checkRateLimit } from "@/lib/upstash";
import { REDIS_RATE_LIMIT_CONFIGS } from "@/lib/upstash/redis-rate-limit-configs";

export interface TaskEvidenceUploadResult {
  key: string;
  presignedUrl: string;
}

export async function createTaskEvidenceUploadAction(
  input: unknown,
): Promise<ActionResult<TaskEvidenceUploadResult>> {
  const session = await getSession();
  const user = session?.user;
  if (!user) return actionResponse.unauthorized();

  const parsed = taskEvidenceUploadInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionResponse.badRequest(
      "Evidence must be a JPEG, PNG, or WebP image no larger than 5 MB.",
      "invalid_evidence_file",
    );
  }

  const definition = manualReviewTasks[parsed.data.taskKey];
  if (!taskRewardsConfig.enabled || !definition.enabled) {
    return actionResponse.forbidden(
      "This task is currently disabled.",
      "task_disabled",
    );
  }

  try {
    const isAllowed = await checkRateLimit(
      user.id,
      REDIS_RATE_LIMIT_CONFIGS.taskEvidenceUpload,
    );
    if (!isAllowed) {
      return actionResponse.error(
        "Too many evidence upload attempts. Please try again later.",
        "task_evidence_upload_rate_limited",
      );
    }

    const upload = await prepareTaskEvidenceUpload({
      userId: user.id,
      input: parsed.data,
      createPresignedUploadUrl: createTaskEvidencePresignedUploadUrl,
    });
    return actionResponse.success(upload);
  } catch (error) {
    console.error("Error creating task evidence upload", error);
    return actionResponse.error(
      "Unable to prepare evidence upload. Please try again later.",
      "task_evidence_upload_unavailable",
    );
  }
}
