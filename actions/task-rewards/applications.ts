"use server";

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

    return mapManualTaskApplicationResult(result, parsed.data.taskKey);
  } catch (error) {
    console.error("Error submitting manual task application", error);
    return actionResponse.error(
      "Unable to submit the task application. Please try again later.",
      "application_submission_failed",
    );
  }
}
