"use server";

import { actionResponse, type ActionResult } from "@/lib/action-response";
import { getSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { getErrorMessage } from "@/lib/error-utils";
import {
  MANUAL_REVIEW_TASK_KEYS,
  buildDailyClaimKey,
  buildOnceClaimKey,
  manualReviewTasks,
  taskRewardsConfig,
} from "@/config/task-rewards";
import {
  claimTaskReward,
  isAutomaticClaimableTaskKey,
} from "@/lib/task-rewards/claim";
import {
  buildTaskRewardItems,
  type TaskRewardsDashboardData,
} from "@/lib/task-rewards/dashboard-data";
import {
  countReferralInvitesForUser,
  createDrizzleTaskRewardStore,
  getClaimedDailyCheckinDatesForUser,
  getTaskClaimLookup,
  hasReferralFirstPurchaseForUser,
  hasSuccessfulPublicGenerationForUser,
  hasSuccessfulPurchaseForUser,
} from "@/lib/task-rewards/drizzle-store";
import type { AutomaticClaimableTaskKey } from "@/lib/task-rewards/types";
import { getLatestManualApplicationsForUser } from "@/lib/task-rewards/drizzle-application-store";

function getTodayClaimKey(now: Date): string {
  return buildDailyClaimKey("daily_checkin", now.toISOString().slice(0, 10));
}

export async function getTaskRewardsDashboardData(
  now: Date = new Date(),
): Promise<ActionResult<TaskRewardsDashboardData>> {
  if (!taskRewardsConfig.enabled) {
    return actionResponse.forbidden("Task rewards are currently disabled.");
  }

  const session = await getSession();
  const user = session?.user;
  if (!user) return actionResponse.unauthorized();

  const db = getDb();

  try {
    const dailyClaimKey = getTodayClaimKey(now);
    const streakDates = [0, 1, 2].map((offset) => {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() - offset);
      return date.toISOString().slice(0, 10);
    });
    const enabledManualTaskKeys = MANUAL_REVIEW_TASK_KEYS.filter(
      (taskKey) => manualReviewTasks[taskKey].enabled,
    );
    const claimKeys = [
      dailyClaimKey,
      buildOnceClaimKey("checkin_3_days"),
      buildOnceClaimKey("first_public_generation"),
      buildOnceClaimKey("first_purchase"),
      ...enabledManualTaskKeys.map(buildOnceClaimKey),
    ];

    const [
      claimLookup,
      claimedStreakDates,
      hasPublicGeneration,
      hasPurchase,
      inviteCount,
      hasInviteFirstPurchase,
      latestManualApplications,
    ] = await Promise.all([
      getTaskClaimLookup(db, user.id, claimKeys),
      getClaimedDailyCheckinDatesForUser(db, user.id, streakDates),
      hasSuccessfulPublicGenerationForUser(db, user.id),
      hasSuccessfulPurchaseForUser(db, user.id),
      countReferralInvitesForUser(db, user.id),
      hasReferralFirstPurchaseForUser(db, user.id),
      getLatestManualApplicationsForUser(db, user.id, enabledManualTaskKeys),
    ]);
    const tasks = buildTaskRewardItems({
      now,
      claimLookup,
      claimedStreakDates,
      hasPublicGeneration,
      hasPurchase,
      inviteCount,
      hasInviteFirstPurchase,
      latestManualApplications,
    });

    return actionResponse.success({ userId: user.id, tasks });
  } catch (error) {
    console.error("Error loading task rewards dashboard", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function claimTaskRewardAction(
  taskKey: AutomaticClaimableTaskKey,
): Promise<
  ActionResult<{ taskKey: AutomaticClaimableTaskKey; creditAmount: number }>
> {
  if (!taskRewardsConfig.enabled) {
    return actionResponse.forbidden("Task rewards are currently disabled.");
  }

  if (!isAutomaticClaimableTaskKey(taskKey)) {
    return actionResponse.forbidden(
      "This task cannot be claimed automatically.",
      "manual_review_required",
    );
  }

  const session = await getSession();
  const user = session?.user;
  if (!user) return actionResponse.unauthorized();

  const db = getDb();

  try {
    const result = await db.transaction(async (tx) =>
      claimTaskReward({
        store: createDrizzleTaskRewardStore(tx),
        userId: user.id,
        taskKey,
        config: taskRewardsConfig,
      }),
    );

    if (result.status === "claimed") {
      return actionResponse.success({
        taskKey,
        creditAmount: result.creditAmount,
      });
    }

    if (result.status === "already_claimed") {
      return actionResponse.error(
        "Task reward already claimed.",
        "already_claimed",
      );
    }

    if (result.status === "not_completed") {
      return actionResponse.error(
        "Task requirements are not completed yet.",
        "not_completed",
      );
    }

    return actionResponse.forbidden(
      "This task is currently disabled.",
      "disabled",
    );
  } catch (error) {
    console.error("Error claiming task reward", error);
    return actionResponse.error(getErrorMessage(error));
  }
}
