import type { ActionResult } from "@/lib/action-response";
import type { ReviewRewardApplicationResult } from "@/lib/task-rewards/applications";
import { z } from "zod";

const baseReviewSchema = z
  .object({
    applicationId: z.string().uuid(),
    decision: z.enum(["approved", "rejected"]),
    reviewNote: z.string().trim().max(500).default(""),
  })
  .strict();

export type AdminRewardApplicationReviewInput = z.infer<
  typeof baseReviewSchema
>;

export type ParsedAdminRewardApplicationReviewInput =
  | { success: true; data: AdminRewardApplicationReviewInput }
  | { success: false; customCode: "validation" };

export function parseAdminRewardApplicationReviewInput(
  input: unknown,
): ParsedAdminRewardApplicationReviewInput {
  const parsed = baseReviewSchema.safeParse(input);
  if (
    !parsed.success ||
    (parsed.data.decision === "rejected" && !parsed.data.reviewNote)
  ) {
    return { success: false, customCode: "validation" };
  }

  return { success: true, data: parsed.data };
}

export type AdminRewardApplicationReviewCustomCode =
  | "validation"
  | "not_found"
  | "already_processed"
  | "already_claimed"
  | "invalid_application";

export type AdminRewardApplicationReviewData =
  | {
      applicationId: string;
      status: "approved";
      creditAmount: number;
    }
  | {
      applicationId: string;
      status: "rejected";
    };

const errorMessages: Record<AdminRewardApplicationReviewCustomCode, string> = {
  validation: "Invalid review request.",
  not_found: "Reward application not found.",
  already_processed: "This reward application has already been processed.",
  already_claimed: "This task reward has already been claimed.",
  invalid_application: "This application is not eligible for manual review.",
};

export function mapAdminRewardApplicationReviewResult(
  result: ReviewRewardApplicationResult,
): ActionResult<AdminRewardApplicationReviewData> {
  if (result.status === "approved") {
    return {
      success: true,
      data: {
        applicationId: result.applicationId,
        status: "approved",
        creditAmount: result.creditAmount,
      },
    };
  }

  if (result.status === "rejected") {
    return {
      success: true,
      data: {
        applicationId: result.applicationId,
        status: "rejected",
      },
    };
  }

  const customCode: AdminRewardApplicationReviewCustomCode =
    result.errorCode === "application_not_found"
      ? "not_found"
      : result.errorCode === "application_not_pending"
        ? "already_processed"
        : result.errorCode === "already_claimed" ||
            result.errorCode === "invalid_application"
          ? result.errorCode
          : "validation";

  return {
    success: false,
    error: errorMessages[customCode],
    customCode,
  };
}
