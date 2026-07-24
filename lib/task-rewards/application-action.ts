import {
  MANUAL_REVIEW_TASK_KEYS,
  type ManualReviewTaskKey,
} from "@/config/task-rewards";
import type { SubmitRewardApplicationResult } from "@/lib/task-rewards/applications";
import { z } from "zod";

export const manualTaskApplicationInputSchema = z
  .object({
    taskKey: z.enum(MANUAL_REVIEW_TASK_KEYS),
    evidenceKey: z.string().trim().min(1),
    submissionText: z.string().trim().min(1).max(500),
  })
  .strict();

export type ManualTaskApplicationInput = z.infer<
  typeof manualTaskApplicationInputSchema
>;

export type ParsedManualTaskApplicationInput =
  | { success: true; data: ManualTaskApplicationInput }
  | { success: false; customCode: "validation" };

export function parseManualTaskApplicationInput(
  input: unknown,
): ParsedManualTaskApplicationInput {
  const parsed = manualTaskApplicationInputSchema.safeParse(input);
  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false, customCode: "validation" };
}

export type ManualTaskApplicationActionCustomCode =
  | "validation"
  | "task_disabled"
  | "already_claimed"
  | "pending_application_exists"
  | "invalid_evidence";

export type ManualTaskApplicationActionResult =
  | {
      success: true;
      data: {
        applicationId: string;
        taskKey: ManualReviewTaskKey;
        creditAmount: number;
      };
    }
  | {
      success: false;
      error: string;
      customCode: ManualTaskApplicationActionCustomCode;
    };

const errorMessages: Record<ManualTaskApplicationActionCustomCode, string> = {
  validation: "Invalid task application.",
  task_disabled: "This task is currently disabled.",
  already_claimed: "This task reward has already been claimed.",
  pending_application_exists: "This task already has a pending application.",
  invalid_evidence: "The submitted evidence is invalid.",
};

export function mapManualTaskApplicationResult(
  result: SubmitRewardApplicationResult,
  taskKey: ManualReviewTaskKey,
): ManualTaskApplicationActionResult {
  if (result.status === "submitted") {
    return {
      success: true,
      data: {
        applicationId: result.applicationId,
        taskKey,
        creditAmount: result.creditAmount,
      },
    };
  }

  const customCode: ManualTaskApplicationActionCustomCode =
    result.errorCode === "task_disabled" ||
    result.errorCode === "already_claimed" ||
    result.errorCode === "pending_application_exists"
      ? result.errorCode
      : result.errorCode === "evidence_required" ||
          result.errorCode === "evidence_not_owned"
        ? "invalid_evidence"
        : "validation";

  return {
    success: false,
    error: errorMessages[customCode],
    customCode,
  };
}
