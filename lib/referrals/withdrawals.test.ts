import assert from "node:assert/strict";
import test from "node:test";

import {
  collectClaimableReferralRewards,
  processReferralWithdrawalRequest,
  type ReferralWithdrawalStore,
} from "@/lib/referrals/withdrawals";

class FakeReferralWithdrawalStore implements ReferralWithdrawalStore {
  claimableRewards = [
    { id: "reward-1", cashAmountUsd: 5 },
    { id: "reward-2", cashAmountUsd: 7.5 },
  ];
  requests: Array<{ userId: string; amountUsd: number; rewardIds: string[] }> = [];
  transitionedRewardIds: string[] = [];
  withdrawalRequests = new Map<
    string,
    { status: "pending" | "paid" | "rejected"; rewardIds: string[] }
  >();
  paidRequestIds: string[] = [];
  rejectedRequestIds: string[] = [];
  paidRewardRequestIds: string[] = [];
  restoredRewardRequestIds: string[] = [];

  async unlockEligibleRewards(): Promise<void> {}

  async getClaimableRewards() {
    return this.claimableRewards;
  }

  async createWithdrawalRequest(input: {
    userId: string;
    amountUsd: number;
    rewardIds: string[];
  }): Promise<string> {
    this.requests.push(input);
    return "request-created";
  }

  async markRewardsPendingWithdraw(
    rewardIds: string[],
    _withdrawRequestId: string
  ): Promise<void> {
    this.transitionedRewardIds.push(...rewardIds);
  }

  async getWithdrawalRequest(requestId: string) {
    return this.withdrawalRequests.get(requestId) ?? null;
  }

  async markWithdrawalRequestPaid(requestId: string): Promise<void> {
    const request = this.withdrawalRequests.get(requestId);
    if (request) {
      request.status = "paid";
    }
    this.paidRequestIds.push(requestId);
  }

  async markWithdrawalRequestRejected(requestId: string): Promise<void> {
    const request = this.withdrawalRequests.get(requestId);
    if (request) {
      request.status = "rejected";
    }
    this.rejectedRequestIds.push(requestId);
  }

  async markRewardsPaidForRequest(requestId: string): Promise<void> {
    this.paidRewardRequestIds.push(requestId);
  }

  async restoreClaimableRewardsForRequest(requestId: string): Promise<void> {
    this.restoredRewardRequestIds.push(requestId);
  }
}

test("creates a withdrawal request from all claimable rewards", async () => {
  const store = new FakeReferralWithdrawalStore();

  const result = await collectClaimableReferralRewards({
    store,
    userId: "user-1",
  });

  assert.equal(result.status, "request_created");
  assert.equal(store.requests.length, 1);
  assert.deepEqual(store.requests[0], {
    userId: "user-1",
    amountUsd: 12.5,
    rewardIds: ["reward-1", "reward-2"],
  });
  assert.deepEqual(store.transitionedRewardIds, ["reward-1", "reward-2"]);
});

test("returns no_claimable_rewards when nothing is available", async () => {
  const store = new FakeReferralWithdrawalStore();
  store.claimableRewards = [];

  const result = await collectClaimableReferralRewards({
    store,
    userId: "user-1",
  });

  assert.equal(result.status, "no_claimable_rewards");
  assert.equal(store.requests.length, 0);
});

test("marks a pending withdrawal request as paid and pays linked rewards", async () => {
  const store = new FakeReferralWithdrawalStore();
  store.withdrawalRequests.set("request-1", {
    status: "pending",
    rewardIds: ["reward-1", "reward-2"],
  });

  const result = await processReferralWithdrawalRequest({
    store,
    requestId: "request-1",
    action: "paid",
  });

  assert.equal(result.status, "processed");
  assert.deepEqual(store.paidRequestIds, ["request-1"]);
  assert.deepEqual(store.paidRewardRequestIds, ["request-1"]);
});

test("rejects a pending withdrawal request and restores linked rewards to claimable", async () => {
  const store = new FakeReferralWithdrawalStore();
  store.withdrawalRequests.set("request-2", {
    status: "pending",
    rewardIds: ["reward-3"],
  });

  const result = await processReferralWithdrawalRequest({
    store,
    requestId: "request-2",
    action: "rejected",
  });

  assert.equal(result.status, "processed");
  assert.deepEqual(store.rejectedRequestIds, ["request-2"]);
  assert.deepEqual(store.restoredRewardRequestIds, ["request-2"]);
});

test("does not process a withdrawal request twice", async () => {
  const store = new FakeReferralWithdrawalStore();
  store.withdrawalRequests.set("request-3", {
    status: "paid",
    rewardIds: ["reward-4"],
  });

  const result = await processReferralWithdrawalRequest({
    store,
    requestId: "request-3",
    action: "rejected",
  });

  assert.equal(result.status, "already_processed");
  assert.deepEqual(store.rejectedRequestIds, []);
  assert.deepEqual(store.restoredRewardRequestIds, []);
});
