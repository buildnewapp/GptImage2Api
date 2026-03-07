import assert from "node:assert/strict";
import test from "node:test";

import {
  bindReferralOnRegistration,
  type ReferralRegistrationStore,
} from "@/lib/referrals/register";

class FakeReferralRegistrationStore implements ReferralRegistrationStore {
  inviterByCode = new Map<string, { userId: string; inviteCode: string }>();
  invitees = new Map<string, { invitedByUserId: string | null; createdAt: Date }>();
  signupRewardInvitees = new Set<string>();
  grantedCreditTotals = new Map<string, number>();
  referralInviteCreations: Array<{ inviterUserId: string; inviteeUserId: string; inviteCode: string }> = [];
  calls: string[] = [];

  async lockInvitee(inviteeUserId: string): Promise<void> {
    this.calls.push(`lockInvitee:${inviteeUserId}`);
  }

  async getInviterByInviteCode(inviteCode: string) {
    this.calls.push(`getInviterByInviteCode:${inviteCode}`);
    return this.inviterByCode.get(inviteCode) ?? null;
  }

  async getInviteeProfile(inviteeUserId: string) {
    this.calls.push(`getInviteeProfile:${inviteeUserId}`);
    return (
      this.invitees.get(inviteeUserId) ?? {
        invitedByUserId: null,
        createdAt: new Date("2026-03-07T00:00:00.000Z"),
      }
    );
  }

  async hasSignupRewardForInvitee(inviteeUserId: string): Promise<boolean> {
    this.calls.push(`hasSignupRewardForInvitee:${inviteeUserId}`);
    return this.signupRewardInvitees.has(inviteeUserId);
  }

  async bindInviteeToInviter({
    inviterUserId,
    inviteeUserId,
    inviteCode,
  }: {
    inviterUserId: string;
    inviteeUserId: string;
    inviteCode: string;
  }): Promise<void> {
    this.calls.push(`bindInviteeToInviter:${inviterUserId}:${inviteeUserId}:${inviteCode}`);
    const invitee = this.invitees.get(inviteeUserId) ?? {
      invitedByUserId: null,
      createdAt: new Date("2026-03-07T00:00:00.000Z"),
    };
    this.invitees.set(inviteeUserId, {
      ...invitee,
      invitedByUserId: inviterUserId,
    });
    this.referralInviteCreations.push({ inviterUserId, inviteeUserId, inviteCode });
  }

  async grantInviterCredits(inviterUserId: string, amount: number): Promise<void> {
    this.calls.push(`grantInviterCredits:${inviterUserId}:${amount}`);
    this.grantedCreditTotals.set(
      inviterUserId,
      (this.grantedCreditTotals.get(inviterUserId) ?? 0) + amount
    );
  }

  async createSignupReward({
    inviterUserId,
    inviteeUserId,
    creditAmount,
  }: {
    inviterUserId: string;
    inviteeUserId: string;
    creditAmount: number;
  }): Promise<void> {
    this.calls.push(`createSignupReward:${inviterUserId}:${inviteeUserId}:${creditAmount}`);
    this.signupRewardInvitees.add(inviteeUserId);
  }
}

test("binds a valid invite code and grants inviter signup credits", async () => {
  const store = new FakeReferralRegistrationStore();
  store.inviterByCode.set("INV123", { userId: "inviter-1", inviteCode: "INV123" });
  store.invitees.set("invitee-1", {
    invitedByUserId: null,
    createdAt: new Date("2026-03-07T00:00:00.000Z"),
  });

  const result = await bindReferralOnRegistration({
    store,
    inviteeUserId: "invitee-1",
    inviteCode: "INV123",
    signupCreditAmount: 100,
  });

  assert.equal(result.status, "bound");
  assert.equal(store.invitees.get("invitee-1")?.invitedByUserId, "inviter-1");
  assert.equal(store.grantedCreditTotals.get("inviter-1"), 100);
  assert.deepEqual(store.referralInviteCreations, [
    {
      inviterUserId: "inviter-1",
      inviteeUserId: "invitee-1",
      inviteCode: "INV123",
    },
  ]);
});

test("skips registration binding when the invite code does not exist", async () => {
  const store = new FakeReferralRegistrationStore();
  store.invitees.set("invitee-1", {
    invitedByUserId: null,
    createdAt: new Date("2026-03-07T00:00:00.000Z"),
  });

  const result = await bindReferralOnRegistration({
    store,
    inviteeUserId: "invitee-1",
    inviteCode: "MISSING",
    signupCreditAmount: 100,
  });

  assert.equal(result.status, "missing_inviter");
  assert.equal(store.grantedCreditTotals.size, 0);
  assert.equal(store.referralInviteCreations.length, 0);
});

test("rejects self-invite attempts", async () => {
  const store = new FakeReferralRegistrationStore();
  store.inviterByCode.set("SELF123", { userId: "invitee-1", inviteCode: "SELF123" });
  store.invitees.set("invitee-1", {
    invitedByUserId: null,
    createdAt: new Date("2026-03-07T00:00:00.000Z"),
  });

  const result = await bindReferralOnRegistration({
    store,
    inviteeUserId: "invitee-1",
    inviteCode: "SELF123",
    signupCreditAmount: 100,
  });

  assert.equal(result.status, "self_invite");
  assert.equal(store.grantedCreditTotals.size, 0);
  assert.equal(store.referralInviteCreations.length, 0);
});

test("does not duplicate binding or credits when auth hook runs twice", async () => {
  const store = new FakeReferralRegistrationStore();
  store.inviterByCode.set("INV123", { userId: "inviter-1", inviteCode: "INV123" });
  store.invitees.set("invitee-1", {
    invitedByUserId: null,
    createdAt: new Date("2026-03-07T00:00:00.000Z"),
  });

  const first = await bindReferralOnRegistration({
    store,
    inviteeUserId: "invitee-1",
    inviteCode: "INV123",
    signupCreditAmount: 100,
  });
  const second = await bindReferralOnRegistration({
    store,
    inviteeUserId: "invitee-1",
    inviteCode: "INV123",
    signupCreditAmount: 100,
  });

  assert.equal(first.status, "bound");
  assert.equal(second.status, "already_bound");
  assert.equal(store.grantedCreditTotals.get("inviter-1"), 100);
  assert.equal(store.referralInviteCreations.length, 1);
});

test("rejects invite acceptance after the one-day acceptance window", async () => {
  const store = new FakeReferralRegistrationStore();
  store.inviterByCode.set("INV123", { userId: "inviter-1", inviteCode: "INV123" });
  store.invitees.set("invitee-1", {
    invitedByUserId: null,
    createdAt: new Date("2026-03-05T00:00:00.000Z"),
  });

  const result = await bindReferralOnRegistration({
    store,
    inviteeUserId: "invitee-1",
    inviteCode: "INV123",
    signupCreditAmount: 100,
  });

  assert.equal(result.status, "expired");
  assert.equal(store.grantedCreditTotals.size, 0);
  assert.equal(store.referralInviteCreations.length, 0);
});
