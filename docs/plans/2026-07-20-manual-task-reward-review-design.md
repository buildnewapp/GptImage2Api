# Manual Task Reward Review Design

## Goal

Generalize the unapplied `signup_bonus_claims` migration into a reusable reward application ledger and add fixed, manually reviewed reward tasks. Registration bonuses remain automatic. External social tasks require one screenshot and a written note, then award credits only after an administrator approves the submission.

## Scope

The fixed manual-review tasks are:

- `github_star`
- `huggingface_like`
- `share_twitter`
- `share_facebook`
- `share_tiktok`
- `share_instagram`

Every task awards 10 credits, is disabled by default, is hidden when disabled, and can be approved once per user. Rejected submissions may be resubmitted.

This change does not add database-managed task definitions. Task definitions remain fixed in application code.

## Data Model

Replace the unapplied `signup_bonus_claims` table in migration `0045` with `reward_applications`.

The table records both system-created reward decisions and user-created review submissions:

- `id`
- `user_id`
- `task_key`
- `source`: `system` or `user`
- `status`: `pending`, `approved`, or `rejected`
- `credit_amount`
- `evidence_urls`
- `submission_text`
- `ip_hash`
- `device_hash`
- `risk_snapshot`
- `review_note`
- `reviewed_by_user_id`
- `submitted_at`
- `reviewed_at`
- `created_at`
- `updated_at`

Partial unique indexes enforce at most one pending application and at most one approved application per user and task. Rejected applications remain immutable history, so a new pending application can be created after rejection.

Existing signup bonus logic creates an approved, system-sourced `signup_bonus` application after credits are granted. Its IP and device indexes continue to support abuse limits. Signup density queries only count approved `signup_bonus` applications.

`task_reward_claims` remains the immutable record of successfully issued task rewards. `credit_logs` remains the balance audit log. Pending and rejected applications never appear in either table.

## User Flow

Disabled manual tasks are omitted from dashboard data and therefore completely hidden in the user interface.

For an enabled manual task:

1. The user opens the fixed target page or share destination.
2. The user uploads one JPEG, PNG, or WebP screenshot and enters a required note.
3. The server validates authentication, task availability, evidence ownership, text length, prior approval, and absence of another pending submission.
4. The server creates a pending `reward_applications` record.
5. The task card displays a pending-review state and prevents another submission.
6. Rejection displays the administrator's reason and permits a new submission.
7. Approval displays the task as completed and prevents all future submissions.

Evidence is uploaded to R2 under a randomized task-evidence path. The application stores controlled object references rather than accepting arbitrary evidence URLs from the client.

## Admin Flow

The admin dashboard provides a reward review page with pending, approved, and rejected filters. Each row shows the user, task, screenshot, submitted text, timestamps, and review history.

Approval runs in one database transaction:

1. Lock the pending application.
2. Confirm the fixed task still exists and the application is pending.
3. Confirm no successful `task_reward_claims` record exists for the user and once-only claim key.
4. Add credits to the user's one-time balance.
5. Insert the corresponding credit log.
6. Insert the immutable task reward claim.
7. Mark the application approved with reviewer and review time.

Unique indexes and the existing claim key uniqueness make repeated clicks, concurrent reviewers, and retries idempotent.

Rejection requires a reason and only changes the application status and review fields. Disabling a task blocks new submissions but does not prevent administrators from resolving submissions that are already pending.

## Validation and Error Handling

- Exactly one screenshot is required.
- Accepted formats are JPEG, PNG, and WebP.
- Maximum evidence size is 5 MB.
- Submission text is trimmed and required, with a 500-character limit.
- Review rejection notes are required and limited to 500 characters.
- Arbitrary task keys and client-supplied credit amounts are rejected.
- Only administrators may list or review applications.
- A user may only view and submit applications belonging to their account.
- Uploaded evidence that is never attached to a submission may be cleaned up separately; automatic cleanup is outside this change.

## Testing

Tests cover:

- Signup bonus abuse limits using generalized applications.
- Hidden disabled tasks and visible enabled tasks.
- Submission validation and duplicate-pending prevention.
- Rejected resubmission and approved one-time enforcement.
- Approval transaction credit issuance and idempotency.
- Rejection without credit issuance.
- Admin authorization.
- Dashboard pending, rejected, and completed states.
- Existing automatic task reward behavior remaining unchanged.

## Migration and Commit Strategy

Migration `0045` has not been applied to a database. Rewrite it to create the final `reward_applications` schema directly rather than adding a follow-up rename migration or compatibility data migration. Regenerate the matching Drizzle snapshot.

Amend the existing signup-abuse commit so the migration, generalized reward application model, manual-review features, tests, and design documentation appear as one coherent change.
