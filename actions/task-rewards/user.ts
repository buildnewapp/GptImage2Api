"use server";

import { actionResponse, type ActionResult } from "@/lib/action-response";
import { getSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { getErrorMessage } from "@/lib/error-utils";
import {
  buildDailyClaimKey,
  buildOnceClaimKey,
  taskRewardsConfig,
} from "@/config/task-rewards";
import { claimTaskReward } from "@/lib/task-rewards/claim";
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
import type { ClaimableTaskKey } from "@/lib/task-rewards/types";

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

    const [
      claimLookup,
      claimedStreakDates,
      hasPublicGeneration,
      hasPurchase,
      inviteCount,
      hasInviteFirstPurchase,
    ] = await Promise.all([
      getTaskClaimLookup(db, user.id, [
        dailyClaimKey,
        buildOnceClaimKey("checkin_3_days"),
        buildOnceClaimKey("first_public_generation"),
        buildOnceClaimKey("first_purchase"),
        buildOnceClaimKey("github_star"),
        buildOnceClaimKey("huggingface_like"),
      ]),
      getClaimedDailyCheckinDatesForUser(db, user.id, streakDates),
      hasSuccessfulPublicGenerationForUser(db, user.id),
      hasSuccessfulPurchaseForUser(db, user.id),
      countReferralInvitesForUser(db, user.id),
      hasReferralFirstPurchaseForUser(db, user.id),
    ]);
    const tasks = buildTaskRewardItems({
      now,
      claimLookup,
      claimedStreakDates,
      hasPublicGeneration,
      hasPurchase,
      inviteCount,
      hasInviteFirstPurchase,
    });

    return actionResponse.success({ userId: user.id, tasks });
  } catch (error) {
    console.error("Error loading task rewards dashboard", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function claimTaskRewardAction(
  taskKey: ClaimableTaskKey,
  options?: { externalTaskStartedAt?: string },
): Promise<ActionResult<{ taskKey: ClaimableTaskKey; creditAmount: number }>> {
  if (!taskRewardsConfig.enabled) {
    return actionResponse.forbidden("Task rewards are currently disabled.");
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
        externalTaskStartedAt: options?.externalTaskStartedAt,
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
      const customCode =
        result.reason === "cooldown" ? "syncing" : "not_completed";
      return actionResponse.error(
        result.reason === "cooldown"
          ? "Task progress is still syncing."
          : "Task requirements are not completed yet.",
        customCode,
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
