# Manual Task Reward Review Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generalize signup bonus applications and add six disabled-by-default, once-only manual tasks that accept one screenshot and text, then award 10 credits only after an administrator approves them.

**Architecture:** Rewrite the unapplied `0045` migration so `reward_applications` stores system and user reward applications, while `task_reward_claims` remains the immutable issued-reward ledger. Manual task submission and review use small domain services with Drizzle adapters; approval locks the application and atomically creates the claim, updates balances, writes the credit log, and updates review state. User evidence uses a task-specific R2 upload action whose object key is bound to the authenticated user and task.

**Tech Stack:** Next.js 16 server actions and App Router, React 19, TypeScript, Drizzle ORM/PostgreSQL, Zod, Cloudflare R2/S3 API, next-intl, Node test runner with tsx.

---

### Task 1: Generalize the unapplied reward application schema

**Files:**
- Modify: `lib/db/schema.ts:445-469`
- Modify: `lib/db/migrations/0045_vengeful_northstar.sql`
- Modify: `lib/db/migrations/meta/0045_snapshot.json`
- Modify: `lib/db/migrations/meta/_journal.json` only if regeneration changes its metadata
- Test: `lib/credits/signup-bonus.test.ts`

**Step 1: Write failing signup store tests**

Update signup bonus tests and test stores to expect an approved system application with:

```ts
{
  taskKey: "signup_bonus",
  source: "system",
  status: "approved",
  creditAmount: resolvedAmount,
  ipHash,
  deviceHash,
}
```

Also assert eligibility counts only include approved `signup_bonus` applications.

**Step 2: Run tests and confirm failure**

Run:

```bash
node --import tsx --test lib/credits/signup-bonus.test.ts
```

Expected: FAIL because the store still exposes `insertSignupBonusClaim` and the schema still exports `signupBonusClaims`.

**Step 3: Replace the schema definition**

Add enums and table fields equivalent to:

```ts
export const rewardApplicationSourceEnum = pgEnum(
  "reward_application_source",
  ["system", "user"],
);
export const rewardApplicationStatusEnum = pgEnum(
  "reward_application_status",
  ["pending", "approved", "rejected"],
);

export const rewardApplications = pgTable("reward_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }).notNull(),
  taskKey: varchar("task_key", { length: 64 }).notNull(),
  source: rewardApplicationSourceEnum("source").notNull(),
  status: rewardApplicationStatusEnum("status").notNull(),
  creditAmount: integer("credit_amount").notNull(),
  evidenceUrls: jsonb("evidence_urls").default("[]").notNull(),
  submissionText: text("submission_text"),
  ipHash: varchar("ip_hash", { length: 64 }),
  deviceHash: varchar("device_hash", { length: 64 }),
  riskSnapshot: jsonb("risk_snapshot").default("{}").notNull(),
  reviewNote: text("review_note"),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => user.id, { onDelete: "set null" }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});
```

Add indexes for `(task_key, status, submitted_at)`, `(user_id, task_key)`, signup IP/time, and signup device/time. Add partial unique indexes for one pending and one approved application per `(user_id, task_key)`.

Rewrite migration `0045` to create this final schema directly. Regenerate or carefully update the matching snapshot so Drizzle metadata agrees with the SQL. Do not add a `0046` migration.

**Step 4: Adapt signup bonus code**

Modify `lib/credits/signup-bonus.ts` to rename the store method to `insertApprovedSystemApplication`, pass resolved credits, insert `taskKey: "signup_bonus"`, and filter eligibility counts by `taskKey` and `status`.

**Step 5: Run focused tests**

```bash
node --import tsx --test lib/credits/signup-bonus.test.ts
```

Expected: PASS.

**Step 6: Amend the existing commit checkpoint**

```bash
git add lib/db/schema.ts lib/db/migrations/0045_vengeful_northstar.sql lib/db/migrations/meta lib/credits/signup-bonus.ts lib/credits/signup-bonus.test.ts
git commit --amend --no-edit
```

### Task 2: Define fixed manual tasks and remove timed auto-claim behavior

**Files:**
- Modify: `config/task-rewards.ts`
- Modify: `lib/task-rewards/types.ts`
- Modify: `lib/task-rewards/definitions.ts`
- Modify: `lib/task-rewards/claim.ts`
- Test: `lib/task-rewards/config.test.ts`
- Test: `lib/task-rewards/claim.test.ts`

**Step 1: Write failing task definition tests**

Assert that the six manual task keys are:

```ts
[
  "github_star",
  "huggingface_like",
  "share_twitter",
  "share_facebook",
  "share_tiktok",
  "share_instagram",
]
```

Each has `enabled: false`, `credits: 10`, and a fixed destination URL. Assert runtime calls to `claimTaskReward` reject manual task keys rather than awarding credits after a cooldown.

**Step 2: Run tests and confirm failure**

```bash
node --import tsx --test lib/task-rewards/config.test.ts lib/task-rewards/claim.test.ts
```

Expected: FAIL because four keys do not exist and GitHub/Hugging Face still use timed claim definitions.

**Step 3: Implement fixed task types**

Introduce:

```ts
export type ManualReviewTaskKey =
  | "github_star"
  | "huggingface_like"
  | "share_twitter"
  | "share_facebook"
  | "share_tiktok"
  | "share_instagram";

export type AutomaticClaimableTaskKey =
  | "daily_checkin"
  | "checkin_3_days"
  | "first_public_generation"
  | "first_purchase";
```

Keep a fixed `manualReviewTasks` record with `enabled`, `credits`, and `targetUrl`. Remove `rewardEnabled`, `cooldownSeconds`, `externalTaskStartedAt`, and timed external definitions. Add a runtime whitelist in the automatic claim action so forged task keys cannot reach the automatic award path.

**Step 4: Run focused tests**

```bash
node --import tsx --test lib/task-rewards/config.test.ts lib/task-rewards/claim.test.ts
```

Expected: PASS.

**Step 5: Amend checkpoint**

```bash
git add config/task-rewards.ts lib/task-rewards
git commit --amend --no-edit
```

### Task 3: Implement reward application submission and review domain services

**Files:**
- Create: `lib/task-rewards/applications.ts`
- Create: `lib/task-rewards/applications.test.ts`
- Create: `lib/task-rewards/application-store.ts`
- Modify: `lib/task-rewards/drizzle-store.ts`

**Step 1: Write failing domain tests**

Cover:

- disabled task submission is rejected;
- missing screenshot or blank text is rejected;
- existing approved claim prevents submission;
- an existing pending application prevents duplication;
- a rejected application permits a new pending application;
- approval creates a once-only claim and marks the application approved;
- rejection requires a note and awards no credits;
- non-pending applications cannot be processed twice;
- claim creation failure leaves the application pending.

Use an in-memory store so business rules are tested without a database.

**Step 2: Run tests and confirm failure**

```bash
node --import tsx --test lib/task-rewards/applications.test.ts
```

Expected: FAIL because the domain service does not exist.

**Step 3: Implement submission validation**

Expose a service shaped like:

```ts
submitManualRewardApplication({
  store,
  userId,
  taskKey,
  evidenceKey,
  submissionText,
  now,
})
```

It must resolve the task from the server-side fixed definitions, trim and validate text, verify evidence ownership through the store, check successful claims and pending applications, then create a pending application using the server-defined 10 credits.

**Step 4: Implement review state transitions**

Expose:

```ts
reviewRewardApplication({
  store,
  applicationId,
  reviewerUserId,
  decision: "approved" | "rejected",
  reviewNote,
  now,
})
```

The Drizzle review adapter must select the application `FOR UPDATE`. Approval calls existing `createDrizzleTaskRewardStore(tx).createClaim` using `buildOnceClaimKey(taskKey)` and metadata containing `applicationId` and reviewer. Only after claim creation succeeds may it mark the application approved.

**Step 5: Run tests**

```bash
node --import tsx --test lib/task-rewards/applications.test.ts lib/task-rewards/claim.test.ts
```

Expected: PASS.

**Step 6: Amend checkpoint**

```bash
git add lib/task-rewards
git commit --amend --no-edit
```

### Task 4: Add secure evidence upload support

**Files:**
- Modify: `lib/cloudflare/r2.ts`
- Create: `actions/task-rewards/evidence.ts`
- Create: `lib/task-rewards/evidence.ts`
- Create: `lib/task-rewards/evidence.test.ts`

**Step 1: Write failing validation tests**

Test MIME/extension normalization, the 5 MB size limit, and strict key ownership:

```text
task-evidence/{userId}/{taskKey}/{uuid}.{png|jpg|webp}
```

Reject SVG, GIF, executable content, path traversal, mismatched users, mismatched tasks, and oversized objects.

**Step 2: Run tests and confirm failure**

```bash
node --import tsx --test lib/task-rewards/evidence.test.ts
```

Expected: FAIL because evidence helpers do not exist.

**Step 3: Add R2 object inspection**

Add a `headObject` helper using `HeadObjectCommand` so submission validates actual `ContentType` and `ContentLength` after upload. Do not trust the client-reported filename, URL, or size.

**Step 4: Add authenticated task-specific upload action**

The action must:

- require a signed-in user;
- accept only enabled manual task keys;
- accept only JPEG, PNG, or WebP and size up to 5 MB;
- generate the path server-side with authenticated `userId` and validated task key;
- return a presigned PUT URL and object key, not a client-selected path;
- never accept a credit amount or arbitrary evidence URL.

Database applications store only the object key. User and administrator preview actions must verify ownership or administrator status before returning a presigned GET URL.

**Step 5: Run tests**

```bash
node --import tsx --test lib/task-rewards/evidence.test.ts
```

Expected: PASS.

**Step 6: Amend checkpoint**

```bash
git add lib/cloudflare/r2.ts actions/task-rewards/evidence.ts lib/task-rewards/evidence.ts lib/task-rewards/evidence.test.ts
git commit --amend --no-edit
```

### Task 5: Expose user submission state and server actions

**Files:**
- Modify: `lib/task-rewards/dashboard-data.ts`
- Modify: `lib/task-rewards/dashboard-data.test.ts`
- Modify: `actions/task-rewards/user.ts`
- Create: `actions/task-rewards/applications.ts`

**Step 1: Write failing dashboard tests**

Assert:

- all six disabled tasks are absent;
- enabling one task adds exactly one 10-credit card;
- no application maps to an available submission state;
- pending maps to pending review;
- rejected includes the latest rejection reason and permits resubmission;
- approved/claimed maps to claimed;
- pending and rejected credits are not included in claimable credit totals.

**Step 2: Run tests and confirm failure**

```bash
node --import tsx --test lib/task-rewards/dashboard-data.test.ts
```

Expected: FAIL because dashboard data still emits under-review timed tasks and lacks four share tasks.

**Step 3: Implement dashboard state**

Add manual statuses `available`, `pending`, and `rejected` to task item data. Query the latest application per enabled manual task and existing once-only claim keys. Only push manual tasks whose fixed definition has `enabled: true`.

**Step 4: Add submission server action**

Validate input with Zod:

```ts
z.object({
  taskKey: manualReviewTaskKeySchema,
  evidenceKey: z.string().min(1),
  submissionText: z.string().trim().min(1).max(500),
})
```

Require login and call the domain submission service inside a transaction. Return stable custom codes for disabled, already claimed, pending, invalid evidence, and validation errors.

**Step 5: Run tests**

```bash
node --import tsx --test lib/task-rewards/dashboard-data.test.ts lib/task-rewards/applications.test.ts
```

Expected: PASS.

**Step 6: Amend checkpoint**

```bash
git add lib/task-rewards actions/task-rewards
git commit --amend --no-edit
```

### Task 6: Build the user screenshot and text submission UI

**Files:**
- Modify: `app/[locale]/(protected)/dashboard/(user)/tasks/TasksClient.tsx`
- Create: `app/[locale]/(protected)/dashboard/(user)/tasks/ManualTaskSubmissionDialog.tsx`
- Modify: `i18n/messages/en/Dashboard/User/Tasks.json`
- Modify: `i18n/messages/zh/Dashboard/User/Tasks.json`
- Modify: `i18n/messages/ja/Dashboard/User/Tasks.json`
- Modify/Test: `lib/task-rewards/copy.test.ts`

**Step 1: Write failing source/copy tests**

Assert all three locales contain six task titles/descriptions and submission, pending, rejected, upload, validation, and success messages. Add a source-level UI test if practical to assert the old localStorage cooldown flow is absent and the manual dialog is used.

**Step 2: Run tests and confirm failure**

```bash
node --import tsx --test lib/task-rewards/copy.test.ts
```

Expected: FAIL because four tasks and manual review copy are missing.

**Step 3: Implement the dialog**

The dialog must:

- open the fixed target/share URL in a new tab;
- accept exactly one image with local preview;
- require text up to 500 characters;
- validate type and 5 MB size before requesting upload;
- obtain the dedicated presigned URL, PUT the file, then submit the returned object key;
- preserve form state on upload or submission error;
- close and refresh on success.

Replace GitHub/Hugging Face localStorage/cooldown logic. Pending cards show a disabled review state. Rejected cards show the review reason and a resubmit button. Disabled tasks never reach the component because dashboard data omits them.

**Step 4: Run copy and component tests**

```bash
node --import tsx --test lib/task-rewards/copy.test.ts lib/task-rewards/dashboard-data.test.ts
```

Expected: PASS.

**Step 5: Amend checkpoint**

```bash
git add app/[locale]/\(protected\)/dashboard/\(user\)/tasks i18n/messages lib/task-rewards/copy.test.ts
git commit --amend --no-edit
```

### Task 7: Build administrator review actions and page

**Files:**
- Create: `lib/task-rewards/admin-lists.ts`
- Create: `lib/task-rewards/admin-lists.test.ts`
- Create: `actions/task-rewards/admin.ts`
- Create: `app/[locale]/(protected)/dashboard/(admin)/task-rewards-admin/page.tsx`
- Create: `app/[locale]/(protected)/dashboard/(admin)/task-rewards-admin/TaskRewardReviewClient.tsx`
- Modify: `i18n/messages/en/common.json`
- Modify: `i18n/messages/zh/common.json`
- Modify: `i18n/messages/ja/common.json`
- Create: `i18n/messages/en/Dashboard/Admin/TaskRewards.json`
- Create: `i18n/messages/zh/Dashboard/Admin/TaskRewards.json`
- Create: `i18n/messages/ja/Dashboard/Admin/TaskRewards.json`
- Modify: `i18n/request.ts`

**Step 1: Write failing admin-list and authorization tests**

Test normalized page sizes, status/task key whitelists, default pending filter, and required rejection notes. Domain review tests from Task 3 cover transactional behavior.

**Step 2: Run tests and confirm failure**

```bash
node --import tsx --test lib/task-rewards/admin-lists.test.ts lib/task-rewards/applications.test.ts
```

Expected: FAIL because admin list helpers do not exist.

**Step 3: Implement admin server actions**

Add:

- paginated list joined to user email, with status/task/email filters;
- administrator-only evidence preview URL generation;
- approve action using the transactional review service;
- reject action requiring a trimmed 1-500 character reason;
- stable errors for not found and already processed states.

Reviewer identity always comes from the server session.

**Step 4: Implement admin UI**

Reuse `AdminPagination`, table/filter patterns from referrals admin, and a Dialog for screenshot/text details and review actions. Default to pending, newest first. Show evidence through an administrator-authorized presigned URL. Add the page to all three admin sidebars and register its translations.

**Step 5: Run focused tests**

```bash
node --import tsx --test lib/task-rewards/admin-lists.test.ts lib/task-rewards/applications.test.ts lib/task-rewards/copy.test.ts
```

Expected: PASS.

**Step 6: Amend checkpoint**

```bash
git add actions/task-rewards app/[locale]/\(protected\)/dashboard/\(admin\)/task-rewards-admin lib/task-rewards i18n
git commit --amend --no-edit
```

### Task 8: Verify migration, type safety, tests, and production build

**Files:**
- Verify all modified files
- Update: `docs/plans/2026-07-20-manual-task-reward-review-design.md` only if implementation decisions differ

**Step 1: Run formatting and whitespace checks**

```bash
git diff --check HEAD^
```

Expected: no output.

**Step 2: Run all related tests**

```bash
node --import tsx --test \
  lib/credits/signup-bonus.test.ts \
  lib/task-rewards/config.test.ts \
  lib/task-rewards/claim.test.ts \
  lib/task-rewards/dashboard-data.test.ts \
  lib/task-rewards/copy.test.ts \
  lib/task-rewards/applications.test.ts \
  lib/task-rewards/evidence.test.ts \
  lib/task-rewards/admin-lists.test.ts
```

Expected: all tests pass.

**Step 3: Run TypeScript validation**

```bash
pnpm exec tsc --noEmit
```

Expected: exit code 0.

**Step 4: Run production build**

```bash
pnpm build
```

Expected: exit code 0 and new task/admin routes compile.

**Step 5: Inspect final migration and commit**

Confirm there is still only one new migration (`0045`) and it creates `reward_applications` directly. Confirm no secrets, local files, or unrelated changes are included.

```bash
git status --short
git show --stat --oneline HEAD
git log -3 --oneline
```

**Step 6: Final amend**

```bash
git add -A
git commit --amend --no-edit
```

Expected: one coherent amended commit with a clean working tree.
