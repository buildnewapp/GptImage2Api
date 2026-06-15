import assert from "node:assert/strict";
import test from "node:test";

import { grantSignupBonusCredits, type SignupBonusStore } from "@/lib/credits/signup-bonus";

class FakeSignupBonusStore implements SignupBonusStore {
  hasExistingLog = false;
  appliedCredits: number[] = [];
  insertedLogs: Array<{ amount: number; type: string }> = [];

  async lockUser(): Promise<void> {}

  async hasSignupBonusLog(): Promise<boolean> {
    return this.hasExistingLog;
  }

  async applyOneTimeCredits(_userId: string, amount: number) {
    this.appliedCredits.push(amount);
    return {
      oneTimeCreditsSnapshot: amount,
      subscriptionCreditsSnapshot: 0,
    };
  }

  async insertCreditLog(log: { amount: number; type: string }): Promise<void> {
    this.insertedLogs.push(log);
  }
}

test("grants half signup bonus credits for limited countries", async () => {
  const store = new FakeSignupBonusStore();

  const granted = await grantSignupBonusCredits({
    store,
    userId: "user-1",
    amount: 30,
    countryCode: "IN",
  });

  assert.equal(granted, true);
  assert.deepEqual(store.appliedCredits, [15]);
  assert.equal(store.insertedLogs[0]?.amount, 15);
});

test("skips signup bonus credits for blocked countries", async () => {
  const store = new FakeSignupBonusStore();

  const granted = await grantSignupBonusCredits({
    store,
    userId: "user-1",
    amount: 30,
    countryCode: "ZZ",
    countryPolicy: {
      limited: [],
      blocked: ["ZZ"],
    },
  });

  assert.equal(granted, false);
  assert.deepEqual(store.appliedCredits, []);
  assert.deepEqual(store.insertedLogs, []);
});
