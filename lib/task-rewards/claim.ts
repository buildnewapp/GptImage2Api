import { taskRewardsConfig } from "@/config/task-rewards";
import { getTaskDefinition } from "@/lib/task-rewards/definitions";
import { createMemoryTaskRewardStore } from "@/lib/task-rewards/store";
import type {
  ClaimTaskRewardParams,
  TaskRewardClaimResult,
} from "@/lib/task-rewards/types";

function toCalendarDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function claimTaskReward({
  store,
  userId,
  taskKey,
  config = taskRewardsConfig,
  now = new Date(),
  externalTaskStartedAt,
}: ClaimTaskRewardParams): Promise<TaskRewardClaimResult> {
  const definition = getTaskDefinition(taskKey);
  if (!definition.isEnabled(config)) {
    return { status: "disabled" };
  }

  const claimKey = definition.claimKey(toCalendarDate(now));
  const alreadyClaimed = await store.hasClaim(userId, claimKey);
  if (alreadyClaimed) {
    return {
      status: "already_claimed",
      claimKey,
    };
  }

  const completion = await definition.evaluate(
    {
      userId,
      calendarDate: toCalendarDate(now),
      now,
      externalTaskStartedAt,
      getClaimedDailyCheckinDates: (calendarDates) =>
        store.getClaimedDailyCheckinDates(userId, calendarDates),
      hasSuccessfulPublicGeneration: () =>
        store.hasSuccessfulPublicGeneration(userId),
      hasSuccessfulPurchase: () => store.hasSuccessfulPurchase(userId),
      countReferralInvites: () => store.countReferralInvites(userId),
      hasReferralFirstPurchase: () => store.hasReferralFirstPurchase(userId),
    },
    config,
  );

  if (!completion.completed) {
    return {
      status: "not_completed",
      reason: completion.reason,
      claimKey,
      progress: completion.progress,
    };
  }

  const creditAmount = definition.creditAmount(config);
  const created = await store.createClaim({
    userId,
    taskKey,
    claimKey,
    creditAmount,
    metadata: externalTaskStartedAt ? { externalTaskStartedAt } : {},
  });

  if (!created) {
    return {
      status: "already_claimed",
      claimKey,
    };
  }

  return {
    status: "claimed",
    claimKey,
    creditAmount,
  };
}

export { createMemoryTaskRewardStore };
