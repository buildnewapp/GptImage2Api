# Task Rewards Design

**Date:** 2026-03-07

**Goal:** Add a lightweight task rewards center with configurable task switches, claim-on-click credit rewards, and minimal intrusion into the existing referral, credit, and video systems.

## Confirmed Product Rules

- Add a dedicated user page at `/dashboard/tasks`.
- Every task has its own `enabled` switch in config.
- The first version includes four tasks:
  - `daily_checkin`: users can claim once per day.
  - `invite_friend`: reuse the existing referral system as a progress/entry card, without issuing a second reward from the task center.
  - `share_site`: users earn credits once after their share link reaches a configurable number of unique visitors.
  - `public_video`: users earn credits once after they have at least one successful public video generation.
- Rewards are only checked and granted when the user clicks the task action. The original systems should not issue task rewards automatically.
- The system should stay intentionally simple. No generic workflow engine, no background scheduler, no achievements layer.

## Recommended Architecture

Use a small dedicated task rewards domain instead of overloading the referral tables or trying to infer all state from `credit_logs`.

The task center should:
- read existing business state from referral and video tables when needed,
- store only task-specific claim history and share-visit tracking in dedicated tables,
- reuse the existing `usage` and `credit_logs` tables for balance mutation and audit.

This keeps the feature easy to extend while avoiding deeper changes to registration, payments, or video generation flows.

## Configuration

Create `config/task-rewards.ts` with a lightweight runtime config object:

- `enabled`
- `dailyCheckin.enabled`
- `dailyCheckin.credits`
- `inviteFriend.enabled`
- `shareSite.enabled`
- `shareSite.credits`
- `shareSite.requiredUniqueVisitors`
- `publicVideo.enabled`
- `publicVideo.credits`

This mirrors the existing `config/referral.ts` pattern and lets the feature be enabled or tuned without touching service code.

## Data Model

### `taskRewardClaims`

Tracks successful task reward claims.

Suggested fields:
- `id`
- `userId`
- `taskKey` = `daily_checkin | share_site | public_video`
- `claimKey`
- `creditAmount`
- `metadata`
- `claimedAt`
- `createdAt`

Key rule:
- `claimKey` must be unique.

Examples:
- `daily_checkin:2026-03-07`
- `share_site:once`
- `public_video:once`

Purpose:
- idempotent reward issuance
- simple status lookup
- no extra state machine

### `taskShareVisits`

Tracks unique share visits for the share-site task.

Suggested fields:
- `id`
- `ownerUserId`
- `visitorToken`
- `fingerprintHash`
- `landingPath`
- `ipHash`
- `userAgent`
- `isBot`
- `visitedAt`
- `createdAt`

Indexes:
- `ownerUserId`
- `ownerUserId + visitorToken`
- `ownerUserId + fingerprintHash`

Purpose:
- count unique visitors for one task only
- keep share anti-abuse logic isolated

## Task Definitions

### 1. Daily Check-In

Behavior:
- visible only when `dailyCheckin.enabled` is true
- user clicks `Claim Credits`
- system checks for a claim row with today's `claimKey`
- if no row exists, grant configured credits

No pre-computation is needed.

### 2. Invite Friend

Behavior:
- visible only when `inviteFriend.enabled` is true
- acts as a marketing/progress card, not a second reward source
- links users to `/dashboard/referrals`
- reads summary/progress from the existing referral data

Reasoning:
- the referral module already owns invitation rewards
- duplicating payout inside task rewards would increase coupling and create double-reward risk

### 3. Share Site

Behavior:
- visible only when `shareSite.enabled` is true
- task card exposes a dedicated share link
- visits record into `taskShareVisits`
- user clicks `Claim Credits`
- system counts distinct valid visitors for that owner
- if the count reaches `requiredUniqueVisitors` and `share_site:once` is unclaimed, grant configured credits

First-version share link:
- use a dedicated redirect route such as `/r/[ownerId]`
- using the user UUID is acceptable for the first release because it avoids introducing another identity field just for sharing

### 4. Public Video

Behavior:
- visible only when `publicVideo.enabled` is true
- user clicks `Claim Credits`
- system checks `video_generations` for at least one row where:
  - `userId = current user`
  - `status = success`
  - `isPublic = true`
- if found and `public_video:once` is unclaimed, grant configured credits

## Share Anti-Abuse Rules

Keep anti-abuse lightweight and good enough for a marketing task:

- ignore obvious bots and crawlers based on user agent
- ignore prefetch/prerender requests
- set or read an anonymous visitor cookie
- also compute a fallback fingerprint from normalized `IP + UA + Accept-Language`
- dedupe primarily by `ownerUserId + visitorToken`
- use `ownerUserId + fingerprintHash` as a fallback guard
- do not count the owner's own visits
- do not fail the redirect if visit recording fails

This is intentionally not a full anti-fraud system. It is enough to prevent trivial self-refresh abuse without adding infrastructure.

## Claiming and Credit Issuance

All real reward issuance should happen in one server-side transactional path:

1. check global and per-task config
2. resolve task-specific completion
3. derive the expected `claimKey`
4. lock/check for an existing claim
5. increment `usage.one_time_credits_balance`
6. insert `credit_logs`
7. insert `taskRewardClaims`

This preserves idempotency and reuses the existing credit wallet audit trail.

## UI Design

### User Page

Route:
- `/dashboard/tasks`

Sections:
- page header
- task card list

Each task card shows:
- title
- short description
- reward amount
- current status
- primary action

Expected actions:
- `daily_checkin`: claim directly
- `invite_friend`: go to referral center
- `share_site`: copy share link
- `public_video`: go to video history or generation page

### Navigation

Add a dashboard menu item:
- `Task Center` / `任务中心` / `タスクセンター`

### Localization

Add a dedicated translation namespace for the new page and task statuses.

## Failure and Edge Cases

- Disabled task: hide in UI and reject server claim requests.
- Already claimed: return a stable "already claimed" response.
- Incomplete task: return a stable "not completed" response with progress details when possible.
- Share visit logging failure: log it, but still redirect visitors.
- Missing referral or video data: block that task claim only, not the whole page.

## Suggested Future Tasks

Not in scope for the first implementation, but good next candidates:
- verify email
- first credit pack purchase
- complete profile
- join community

The first release should ship only the four confirmed tasks.
