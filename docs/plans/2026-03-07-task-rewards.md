# Task Rewards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a lightweight task rewards center with configurable task switches, a dedicated `/dashboard/tasks` page, claim-on-click rewards, share-link visitor tracking, and reuse of the existing referral, credit, and video systems.

**Architecture:** Add a small dedicated task rewards domain with config, claim records, and share-visit tracking tables. Read completion state from existing referral and video tables, but keep reward issuance inside one new transactional claim path that writes to `usage`, `credit_logs`, and `task_reward_claims`.

**Tech Stack:** Next.js App Router, server actions, Drizzle ORM, PostgreSQL, next-intl, existing dashboard UI components, Node test runner with `tsx`

---

### Task 1: Add task reward config and schema

**Files:**
- Create: `config/task-rewards.ts`
- Modify: `lib/db/schema.ts`
- Create: `lib/db/migrations/0028_task_rewards.sql`
- Modify: `lib/db/migrations/meta/_journal.json`
- Test: `lib/task-rewards/config.test.ts`

**Step 1: Write the failing test**

Create `lib/task-rewards/config.test.ts` covering:
- task config resolves the global and per-task `enabled` switches
- share-site config exposes `requiredUniqueVisitors`
- one-time tasks use stable once-only claim keys

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOnceClaimKey,
  buildDailyClaimKey,
  taskRewardsConfig,
} from "@/config/task-rewards";

test("builds daily claim key from calendar date", () => {
  assert.equal(buildDailyClaimKey("daily_checkin", "2026-03-07"), "daily_checkin:2026-03-07");
});

test("builds once-only claim key", () => {
  assert.equal(buildOnceClaimKey("share_site"), "share_site:once");
});

test("exposes share visitor threshold", () => {
  assert.equal(taskRewardsConfig.shareSite.requiredUniqueVisitors > 0, true);
});
```

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test lib/task-rewards/config.test.ts`
Expected: FAIL because the task rewards config module does not exist.

**Step 3: Write minimal implementation**

Add `config/task-rewards.ts` with:
- `taskRewardsConfig`
- `TaskRewardKey`
- `buildDailyClaimKey`
- `buildOnceClaimKey`

Add Drizzle schema for:
- `task_reward_claims`
- `task_share_visits`

Recommended shape:

```ts
export const taskRewardClaims = pgTable("task_reward_claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }).notNull(),
  taskKey: varchar("task_key", { length: 50 }).notNull(),
  claimKey: varchar("claim_key", { length: 120 }).notNull().unique(),
  creditAmount: integer("credit_amount").notNull(),
  metadata: jsonb("metadata").default("{}").notNull(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test lib/task-rewards/config.test.ts`
Expected: PASS

**Step 5: Verify TypeScript**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0

**Step 6: Commit**

```bash
git add config/task-rewards.ts lib/db/schema.ts lib/db/migrations lib/task-rewards/config.test.ts
git commit -m "feat: add task rewards schema and config"
```

### Task 2: Build the task reward service layer

**Files:**
- Create: `lib/task-rewards/types.ts`
- Create: `lib/task-rewards/store.ts`
- Create: `lib/task-rewards/definitions.ts`
- Create: `lib/task-rewards/claim.ts`
- Test: `lib/task-rewards/claim.test.ts`

**Step 1: Write the failing test**

Create `lib/task-rewards/claim.test.ts` covering:
- daily check-in can claim once per date
- once-only tasks reject duplicate claims
- incomplete tasks do not grant credits
- successful claims produce the expected `claimKey`

```ts
test("share-site reward can only be claimed once", async () => {
  const store = createMemoryTaskRewardStore({ uniqueVisitors: 10 });

  const first = await claimTaskReward({ store, userId: "u1", taskKey: "share_site" });
  const second = await claimTaskReward({ store, userId: "u1", taskKey: "share_site" });

  assert.equal(first.status, "claimed");
  assert.equal(second.status, "already_claimed");
});
```

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test lib/task-rewards/claim.test.ts`
Expected: FAIL because the claim service does not exist.

**Step 3: Write minimal implementation**

Implement:
- typed task definitions
- task status/result types
- a store interface for claim checks and balance mutation
- `claimTaskReward` that:
  - validates config
  - resolves completion
  - derives `claimKey`
  - writes credits and claim rows transactionally

Suggested entry point:

```ts
export async function claimTaskReward(params: {
  store: TaskRewardStore;
  userId: string;
  taskKey: ClaimableTaskKey;
  now?: Date;
}): Promise<TaskRewardClaimResult> {
  // validate task
  // check completion
  // check existing claim
  // grant usage + credit log + claim row
}
```

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test lib/task-rewards/claim.test.ts`
Expected: PASS

**Step 5: Verify TypeScript**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0

**Step 6: Commit**

```bash
git add lib/task-rewards
git commit -m "feat: add task rewards claim service"
```

### Task 3: Implement share-link visit capture and anti-abuse guards

**Files:**
- Create: `lib/task-rewards/share-visits.ts`
- Create: `app/r/[ownerId]/route.ts`
- Test: `lib/task-rewards/share-visits.test.ts`

**Step 1: Write the failing test**

Create `lib/task-rewards/share-visits.test.ts` covering:
- bot user agents are ignored
- self-visits are ignored
- the same visitor token counts once per owner
- fingerprint fallback blocks trivial duplicate counting

```ts
test("ignores bot visits", () => {
  const result = normalizeShareVisit({
    ownerUserId: "u1",
    ip: "1.2.3.4",
    userAgent: "Googlebot/2.1",
    acceptLanguage: "en",
  });

  assert.equal(result.shouldCount, false);
});
```

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test lib/task-rewards/share-visits.test.ts`
Expected: FAIL because share visit helpers do not exist.

**Step 3: Write minimal implementation**

Implement:
- visitor token cookie helper
- bot/prefetch detection
- normalized fingerprint hashing
- redirect route that records a valid visit and then redirects to `/`

Recommended route shape:

```ts
export async function GET(request: NextRequest, { params }: { params: Promise<{ ownerId: string }> }) {
  // resolve owner
  // read or set visitor token
  // ignore bots/prefetch/self
  // insert deduped visit
  // redirect
}
```

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test lib/task-rewards/share-visits.test.ts`
Expected: PASS

**Step 5: Verify TypeScript**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0

**Step 6: Commit**

```bash
git add lib/task-rewards/share-visits.ts app/r/[ownerId]/route.ts lib/task-rewards/share-visits.test.ts
git commit -m "feat: add share visit tracking for task rewards"
```

### Task 4: Expose task center data and claim actions

**Files:**
- Create: `actions/task-rewards/user.ts`
- Modify: `actions/referrals/user.ts`
- Modify: `app/api/video/history/route.ts`
- Test: `lib/task-rewards/claim.test.ts`

**Step 1: Write the failing test**

Extend `lib/task-rewards/claim.test.ts` or add action-focused tests covering:
- daily check-in returns `claimed` and credit amount
- incomplete public-video task returns `not_completed`
- share-site returns remaining visitor count when under threshold

```ts
assert.deepEqual(result, {
  status: "not_completed",
  progress: { current: 7, required: 10 },
});
```

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test lib/task-rewards/claim.test.ts`
Expected: FAIL because progress payloads are not implemented.

**Step 3: Write minimal implementation**

Create a server action module that:
- loads task center data for the current user
- returns per-task status and progress
- claims supported rewards through the transactional service

Expose data needed by the UI:
- referral summary link and counts
- share link and unique visitor count
- public video completion state
- daily check-in availability

If the current video history API already returns enough fields, do not add a new API. Only reuse the existing `video_generations` table directly inside the action.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test lib/task-rewards/claim.test.ts`
Expected: PASS

**Step 5: Verify TypeScript**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0

**Step 6: Commit**

```bash
git add actions/task-rewards/user.ts actions/referrals/user.ts app/api/video/history/route.ts lib/task-rewards/claim.test.ts
git commit -m "feat: add task rewards actions and progress checks"
```

### Task 5: Build the `/dashboard/tasks` page and navigation

**Files:**
- Create: `app/[locale]/(protected)/dashboard/(user)/tasks/page.tsx`
- Create: `app/[locale]/(protected)/dashboard/(user)/tasks/TasksClient.tsx`
- Modify: `i18n/request.ts`
- Create: `i18n/messages/en/Dashboard/User/Tasks.json`
- Create: `i18n/messages/zh/Dashboard/User/Tasks.json`
- Create: `i18n/messages/ja/Dashboard/User/Tasks.json`
- Modify: `i18n/messages/en/common.json`
- Modify: `i18n/messages/zh/common.json`
- Modify: `i18n/messages/ja/common.json`

**Step 1: Write the failing test**

Create a minimal UI test if the repo already uses one. If not, define a manual verification checklist in the task notes and use TypeScript compilation as the guard.

Manual checks:
- task center menu appears
- disabled tasks do not render
- daily check-in button state updates after claim
- share card copies a share link
- invite card links to the referral page

**Step 2: Run verification to confirm the page is missing**

Run: `pnpm exec tsc --noEmit`
Expected: FAIL after adding imports/usages that reference missing task-center files.

**Step 3: Write minimal implementation**

Add a simple card-based page that:
- renders only enabled tasks
- shows reward amount and status
- calls the new server actions
- uses existing dashboard card/button primitives

Keep the interaction model simple:

```tsx
<Button onClick={() => handleClaim("daily_checkin")}>
  {task.status === "claimable" ? t("claim") : t("goComplete")}
</Button>
```

**Step 4: Run verification to confirm it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0

**Step 5: Optional targeted check**

Run: `pnpm exec eslint "app/[locale]/(protected)/dashboard/(user)/tasks/**/*.{ts,tsx}" "actions/task-rewards/**/*.ts" "lib/task-rewards/**/*.ts"`
Expected: exit code 0

**Step 6: Commit**

```bash
git add app/[locale]/(protected)/dashboard/(user)/tasks i18n/request.ts i18n/messages/en/Dashboard/User/Tasks.json i18n/messages/zh/Dashboard/User/Tasks.json i18n/messages/ja/Dashboard/User/Tasks.json i18n/messages/en/common.json i18n/messages/zh/common.json i18n/messages/ja/common.json
git commit -m "feat: add task rewards dashboard page"
```

### Task 6: Final verification and polish

**Files:**
- Modify: `docs/plans/2026-03-07-task-rewards-design.md`
- Modify: `docs/plans/2026-03-07-task-rewards.md`

**Step 1: Run focused tests**

Run:
- `node --import tsx --test lib/task-rewards/config.test.ts`
- `node --import tsx --test lib/task-rewards/claim.test.ts`
- `node --import tsx --test lib/task-rewards/share-visits.test.ts`

Expected: PASS

**Step 2: Run project verification**

Run:
- `pnpm exec tsc --noEmit`
- `pnpm exec eslint "app/[locale]/(protected)/dashboard/(user)/tasks/**/*.{ts,tsx}" "actions/task-rewards/**/*.ts" "lib/task-rewards/**/*.ts"`

Expected: exit code 0

**Step 3: Document any implementation deviations**

If the final code differs from the design, update the design doc and plan doc with the concrete reason, such as:
- route path adjusted for App Router constraints
- share link target changed from `/` to a marketing landing page

**Step 4: Commit**

```bash
git add docs/plans/2026-03-07-task-rewards-design.md docs/plans/2026-03-07-task-rewards.md
git commit -m "docs: finalize task rewards plan"
```
