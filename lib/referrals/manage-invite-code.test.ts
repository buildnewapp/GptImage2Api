import assert from "node:assert/strict";
import test from "node:test";

import {
  saveReferralInviteCode,
  type ReferralInviteCodeStore,
} from "@/lib/referrals/manage-invite-code";

class FakeReferralInviteCodeStore implements ReferralInviteCodeStore {
  users = new Map<
    string,
    { inviteCode: string | null; inviteCodeChangeCount: number }
  >();
  inviteCodeOwners = new Map<string, string>();

  async lockUser(userId: string): Promise<void> {
    const existing = this.users.get(userId);
    if (!existing) {
      this.users.set(userId, {
        inviteCode: null,
        inviteCodeChangeCount: 0,
      });
    }
  }

  async getUserProfile(userId: string) {
    return (
      this.users.get(userId) ?? {
        inviteCode: null,
        inviteCodeChangeCount: 0,
      }
    );
  }

  async findUserIdByInviteCode(inviteCode: string) {
    return this.inviteCodeOwners.get(inviteCode) ?? null;
  }

  async saveInviteCode(userId: string, inviteCode: string, inviteCodeChangeCount: number) {
    const previous = this.users.get(userId);
    if (previous?.inviteCode) {
      this.inviteCodeOwners.delete(previous.inviteCode);
    }
    this.users.set(userId, { inviteCode, inviteCodeChangeCount });
    this.inviteCodeOwners.set(inviteCode, userId);
  }
}

test("allows a user to save the first custom invite code", async () => {
  const store = new FakeReferralInviteCodeStore();

  const result = await saveReferralInviteCode({
    store,
    userId: "user-1",
    inviteCode: "new-12",
  });

  assert.equal(result.status, "saved");
  assert.equal(result.inviteCode, "NEW12");
  assert.equal(result.inviteCodeChangeCount, 1);
});

test("allows exactly one invite code change after the first save", async () => {
  const store = new FakeReferralInviteCodeStore();
  store.users.set("user-1", {
    inviteCode: "FIRST1",
    inviteCodeChangeCount: 1,
  });
  store.inviteCodeOwners.set("FIRST1", "user-1");

  const result = await saveReferralInviteCode({
    store,
    userId: "user-1",
    inviteCode: "second2",
  });

  assert.equal(result.status, "saved");
  assert.equal(result.inviteCode, "SECOND2");
  assert.equal(result.inviteCodeChangeCount, 2);
});

test("rejects invite code changes after the post-creation change limit is exhausted", async () => {
  const store = new FakeReferralInviteCodeStore();
  store.users.set("user-1", {
    inviteCode: "SECOND2",
    inviteCodeChangeCount: 2,
  });
  store.inviteCodeOwners.set("SECOND2", "user-1");

  const result = await saveReferralInviteCode({
    store,
    userId: "user-1",
    inviteCode: "third333",
  });

  assert.equal(result.status, "change_limit_reached");
});

test("rejects invite codes shorter than the minimum length", async () => {
  const store = new FakeReferralInviteCodeStore();

  const result = await saveReferralInviteCode({
    store,
    userId: "user-1",
    inviteCode: "abc",
  });

  assert.equal(result.status, "too_short");
});

test("rejects invite codes that are already owned by another user", async () => {
  const store = new FakeReferralInviteCodeStore();
  store.users.set("user-2", {
    inviteCode: "TAKEN1",
    inviteCodeChangeCount: 1,
  });
  store.inviteCodeOwners.set("TAKEN1", "user-2");

  const result = await saveReferralInviteCode({
    store,
    userId: "user-1",
    inviteCode: "taken1",
  });

  assert.equal(result.status, "duplicate");
});
