import assert from "node:assert/strict";
import test from "node:test";
import { drizzle } from "drizzle-orm/postgres-js";

import { creditConfig } from "@/config/credit";
import {
  buildSignupBonusDeviceEligibilityQuery,
  buildSignupBonusIpEligibilityQuery,
  grantSignupBonusCredits,
  type SignupBonusStore,
} from "@/lib/credits/signup-bonus";
import * as schema from "@/lib/db/schema";

class FakeSignupBonusStore implements SignupBonusStore {
  hasExistingLog = false;
  eligibilityCounts = {
    ip24Hours: 0,
    ip7Days: 0,
    device30Days: 0,
  };
  appliedCredits: number[] = [];
  insertedLogs: Array<{ amount: number; type: string }> = [];
  insertedClaims: Array<{
    userId: string;
    taskKey: "signup_bonus";
    source: "system";
    status: "approved";
    creditAmount: number;
    ipHash?: string | null;
    deviceHash?: string | null;
  }> = [];

  async lockUser(): Promise<void> {}

  async lockEligibilityKeys(): Promise<void> {}

  async getEligibilityCounts() {
    return this.eligibilityCounts;
  }

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

  async insertRewardApplication(claim: {
    userId: string;
    taskKey: "signup_bonus";
    source: "system";
    status: "approved";
    creditAmount: number;
    ipHash?: string | null;
    deviceHash?: string | null;
  }): Promise<void> {
    this.insertedClaims.push(claim);
  }
}

test("configures new users to receive 10 signup credits", () => {
  assert.equal(creditConfig.signupBonusCredits, 10);
});

test("grants half signup bonus credits for limited countries", async () => {
  const store = new FakeSignupBonusStore();

  const granted = await grantSignupBonusCredits({
    store,
    userId: "user-1",
    amount: 30,
    countryCode: "PK",
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

test("skips signup bonus when the email contains a blocked keyword", async () => {
  const store = new FakeSignupBonusStore();

  const granted = await grantSignupBonusCredits({
    store,
    userId: "user-1",
    amount: 10,
    email: "25valwagten@gmail.com",
    blockedEmailKeywords: ["valwagten"],
  });

  assert.equal(granted, false);
  assert.deepEqual(store.appliedCredits, []);
});

test("allows at most two signup bonuses from one IP in 24 hours", async () => {
  const store = new FakeSignupBonusStore();
  store.eligibilityCounts.ip24Hours = 2;

  const granted = await grantSignupBonusCredits({
    store,
    userId: "user-3",
    amount: 10,
    ipHash: "ip-hash",
  });

  assert.equal(granted, false);
  assert.deepEqual(store.appliedCredits, []);
});

test("allows at most three signup bonuses from one IP in seven days", async () => {
  const store = new FakeSignupBonusStore();
  store.eligibilityCounts.ip7Days = 3;

  const granted = await grantSignupBonusCredits({
    store,
    userId: "user-4",
    amount: 10,
    ipHash: "ip-hash",
  });

  assert.equal(granted, false);
  assert.deepEqual(store.appliedCredits, []);
});

test("allows only one signup bonus per device in 30 days", async () => {
  const store = new FakeSignupBonusStore();
  store.eligibilityCounts.device30Days = 1;

  const granted = await grantSignupBonusCredits({
    store,
    userId: "user-2",
    amount: 10,
    deviceHash: "device-hash",
  });

  assert.equal(granted, false);
  assert.deepEqual(store.appliedCredits, []);
});

test("records an approved system reward application with the resolved signup bonus", async () => {
  const store = new FakeSignupBonusStore();

  const granted = await grantSignupBonusCredits({
    store,
    userId: "user-1",
    amount: 30,
    countryCode: "PK",
    ipHash: "ip-hash",
    deviceHash: "device-hash",
  });

  assert.equal(granted, true);
  assert.deepEqual(store.insertedClaims, [
    {
      userId: "user-1",
      taskKey: "signup_bonus",
      source: "system",
      status: "approved",
      creditAmount: 15,
      ipHash: "ip-hash",
      deviceHash: "device-hash",
    },
  ]);
});

test("builds the IP eligibility query with indexable predicates in the top-level WHERE", () => {
  const db = drizzle.mock({ schema });

  const oneDayAgo = new Date("2026-07-19T00:00:00.000Z");
  const sevenDaysAgo = new Date("2026-07-13T00:00:00.000Z");
  const compiled = buildSignupBonusIpEligibilityQuery(db, {
    ipHash: "ip-hash",
    oneDayAgo,
    sevenDaysAgo,
  }).toSQL();
  const topLevelWhere = compiled.sql.slice(compiled.sql.lastIndexOf(" where "));

  assert.match(compiled.sql, /count\(\*\) filter \(where .*submitted_at.*>=/);
  assert.match(compiled.sql, /count\(\*\)::int/);
  assert.match(topLevelWhere, /task_key/);
  assert.match(topLevelWhere, /status/);
  assert.match(topLevelWhere, /ip_hash/);
  assert.match(topLevelWhere, /submitted_at/);
  assert.deepEqual(compiled.params, [
    oneDayAgo,
    "signup_bonus",
    "approved",
    "ip-hash",
    sevenDaysAgo.toISOString(),
  ]);
});

test("builds the device eligibility query with indexable predicates in the top-level WHERE", () => {
  const db = drizzle.mock({ schema });

  const thirtyDaysAgo = new Date("2026-06-20T00:00:00.000Z");
  const compiled = buildSignupBonusDeviceEligibilityQuery(db, {
    deviceHash: "device-hash",
    thirtyDaysAgo,
  }).toSQL();
  const topLevelWhere = compiled.sql.slice(compiled.sql.lastIndexOf(" where "));

  assert.match(topLevelWhere, /task_key/);
  assert.match(topLevelWhere, /status/);
  assert.match(topLevelWhere, /device_hash/);
  assert.match(topLevelWhere, /submitted_at/);
  assert.deepEqual(compiled.params, [
    "signup_bonus",
    "approved",
    "device-hash",
    thirtyDaysAgo.toISOString(),
  ]);
});
