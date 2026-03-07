import assert from "node:assert/strict";
import test from "node:test";

import {
  grantFirstOrderRewardIfEligible,
  type FirstOrderRewardStore,
} from "@/lib/referrals/first-order";

class FakeFirstOrderRewardStore implements FirstOrderRewardStore {
  inviteeProfile:
    | { inviterUserId: string | null; createdAt: Date }
    | null = null;
  paidOrderCountBeforeThisOrder = 0;
  hasExistingCashRewardValue = false;
  createdRewards: Array<{
    inviterUserId: string;
    inviteeUserId: string;
    sourceOrderId: string;
    cashAmountUsd: number;
    availableAt: Date;
  }> = [];

  async getInviteeProfile() {
    return this.inviteeProfile;
  }

  async countPaidOrdersBeforeThisOrder() {
    return this.paidOrderCountBeforeThisOrder;
  }

  async hasExistingCashReward() {
    return this.hasExistingCashRewardValue;
  }

  async createLockedCashReward(input: {
    inviterUserId: string;
    inviteeUserId: string;
    sourceOrderId: string;
    cashAmountUsd: number;
    availableAt: Date;
  }) {
    this.createdRewards.push(input);
  }
}

test("creates a locked first-order reward for the first qualifying order", async () => {
  const store = new FakeFirstOrderRewardStore();
  store.inviteeProfile = {
    inviterUserId: "inviter-1",
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
  };

  const result = await grantFirstOrderRewardIfEligible({
    store,
    inviteeUserId: "invitee-1",
    sourceOrderId: "order-1",
    orderAmountUsd: 120,
    paidAt: new Date("2026-03-20T00:00:00.000Z"),
    qualificationDays: 30,
    rewardMode: "fixed",
    fixedUsd: 5,
    percent: 10,
    lockDays: 30,
  });

  assert.equal(result.status, "reward_created");
  assert.equal(store.createdRewards.length, 1);
  assert.equal(store.createdRewards[0]?.cashAmountUsd, 5);
  assert.equal(
    store.createdRewards[0]?.availableAt.toISOString(),
    "2026-04-19T00:00:00.000Z"
  );
});

test("skips when the order is outside the qualification window", async () => {
  const store = new FakeFirstOrderRewardStore();
  store.inviteeProfile = {
    inviterUserId: "inviter-1",
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
  };

  const result = await grantFirstOrderRewardIfEligible({
    store,
    inviteeUserId: "invitee-1",
    sourceOrderId: "order-1",
    orderAmountUsd: 120,
    paidAt: new Date("2026-04-20T00:00:00.000Z"),
    qualificationDays: 30,
    rewardMode: "fixed",
    fixedUsd: 5,
    percent: 10,
    lockDays: 30,
  });

  assert.equal(result.status, "outside_window");
  assert.equal(store.createdRewards.length, 0);
});

test("skips when the order is not the first paid order or reward already exists", async () => {
  const store = new FakeFirstOrderRewardStore();
  store.inviteeProfile = {
    inviterUserId: "inviter-1",
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
  };
  store.paidOrderCountBeforeThisOrder = 1;

  const nonFirst = await grantFirstOrderRewardIfEligible({
    store,
    inviteeUserId: "invitee-1",
    sourceOrderId: "order-1",
    orderAmountUsd: 120,
    paidAt: new Date("2026-03-20T00:00:00.000Z"),
    qualificationDays: 30,
    rewardMode: "fixed",
    fixedUsd: 5,
    percent: 10,
    lockDays: 30,
  });

  assert.equal(nonFirst.status, "not_first_order");
  assert.equal(store.createdRewards.length, 0);

  store.paidOrderCountBeforeThisOrder = 0;
  store.hasExistingCashRewardValue = true;

  const duplicate = await grantFirstOrderRewardIfEligible({
    store,
    inviteeUserId: "invitee-1",
    sourceOrderId: "order-2",
    orderAmountUsd: 120,
    paidAt: new Date("2026-03-20T00:00:00.000Z"),
    qualificationDays: 30,
    rewardMode: "fixed",
    fixedUsd: 5,
    percent: 10,
    lockDays: 30,
  });

  assert.equal(duplicate.status, "reward_exists");
  assert.equal(store.createdRewards.length, 0);
});
