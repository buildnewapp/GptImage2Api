# Client Auth Ticket Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a third-party client login handshake that lets a browser page sign a user in, create a one-time `client_id` ticket in `cache_db`, and let external clients poll for a short-lived JWT.

**Architecture:** Add a database-backed temporary-state table named `cache_db`, a small auth client-ticket service, a dedicated `/client-auth/signin` page that reuses the existing login form, and two API routes: one to create a ticket from the current session and one to atomically consume the ticket.

**Tech Stack:** Next.js App Router, Better Auth, Drizzle ORM, PostgreSQL, next-intl, `jose`, Node test runner with `tsx`

---

### Task 1: Add failing tests for cache ticket semantics

**Files:**
- Create: `lib/auth/client-ticket-store.test.ts`
- Create: `lib/auth/client-token.test.ts`

**Step 1: Write the failing test**

Create `lib/auth/client-ticket-store.test.ts` covering:
- `saveClientTicket` stores a live ticket under `auth_client + client_id`
- `consumeClientTicket` returns `pending` when no row exists
- `consumeClientTicket` returns `expired_or_consumed` after expiry
- `consumeClientTicket` returns `expired_or_consumed` after first successful read
- saving a new ticket for the same `client_id` overwrites the previous one

Create `lib/auth/client-token.test.ts` covering:
- the signed JWT includes the expected user payload fields
- the token expiry is 10 minutes by default

Example store test:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  consumeClientTicket,
  saveClientTicket,
} from "@/lib/auth/client-ticket-store";

test("consumes a ticket once and only once", async () => {
  const store = createMemoryClientTicketStore();

  await saveClientTicket({
    store,
    clientId: "abc",
    redirectUri: "figma-plugin",
    accessToken: "token-1",
    user: { uuid: "u1", email: "a@example.com", nickname: "A", avatar_url: null, created_at: "2026-03-07T00:00:00.000Z" },
    now: new Date("2026-03-07T00:00:00.000Z"),
  });

  const first = await consumeClientTicket({ store, clientId: "abc", now: new Date("2026-03-07T00:01:00.000Z") });
  const second = await consumeClientTicket({ store, clientId: "abc", now: new Date("2026-03-07T00:01:01.000Z") });

  assert.equal(first.code, 0);
  assert.equal(second.code, 1002);
});
```

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test lib/auth/client-ticket-store.test.ts lib/auth/client-token.test.ts`
Expected: FAIL because the client ticket store and token signer do not exist.

**Step 3: Write minimal implementation**

Do not write production code yet beyond the minimum required to make the tests compile and fail for the intended reason.

**Step 4: Run test to verify it fails correctly**

Run: `node --import tsx --test lib/auth/client-ticket-store.test.ts lib/auth/client-token.test.ts`
Expected: FAIL with missing exports or not-implemented behavior, not TypeScript import errors unrelated to the feature.

**Step 5: Commit**

```bash
git add lib/auth/client-ticket-store.test.ts lib/auth/client-token.test.ts
git commit -m "test: add client auth ticket tests"
```

### Task 2: Add `cache_db` schema and migration

**Files:**
- Modify: `lib/db/schema.ts`
- Create: `lib/db/migrations/0029_breezy_cache_db.sql`
- Modify: `lib/db/migrations/meta/_journal.json`

**Step 1: Write the failing test**

Use `lib/auth/client-ticket-store.test.ts` as the active failing test for this task, because the store will need schema-backed types and query shape.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test lib/auth/client-ticket-store.test.ts`
Expected: FAIL because the table schema and store implementation do not exist.

**Step 3: Write minimal implementation**

Add a `cacheDb` table to [schema.ts](/Users/syx/WebstormProjects/Nexty-template/nexty.dev-cf-pg/lib/db/schema.ts) with:

```ts
export const cacheDb = pgTable(
  "cache_db",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    namespace: varchar("namespace", { length: 80 }).notNull(),
    cacheKey: varchar("cache_key", { length: 128 }).notNull(),
    valueJsonb: jsonb("value_jsonb").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => ({
    namespaceCacheKeyUnique: unique("cache_db_namespace_cache_key_unique").on(table.namespace, table.cacheKey),
    expiresAtIdx: index("idx_cache_db_expires_at").on(table.expiresAt),
    consumedAtIdx: index("idx_cache_db_consumed_at").on(table.consumedAt),
  }),
);
```

Create the matching SQL migration and update the journal entry to `0029_breezy_cache_db`.

**Step 4: Run test to verify it still fails for the next missing layer**

Run: `node --import tsx --test lib/auth/client-ticket-store.test.ts`
Expected: FAIL because the store behavior still does not exist, but imports and schema references compile.

**Step 5: Verify TypeScript**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0

**Step 6: Commit**

```bash
git add lib/db/schema.ts lib/db/migrations/0029_breezy_cache_db.sql lib/db/migrations/meta/_journal.json
git commit -m "feat: add cache db schema for client auth tickets"
```

### Task 3: Implement the token signer and ticket store

**Files:**
- Create: `lib/auth/client-token.ts`
- Create: `lib/auth/client-ticket-store.ts`
- Test: `lib/auth/client-token.test.ts`
- Test: `lib/auth/client-ticket-store.test.ts`

**Step 1: Write the failing test**

Use the tests from Task 1 as the red state. Extend if needed to cover:
- `saveClientTicket` upserts by `namespace + cacheKey`
- `consumeClientTicket` marks the row consumed on first read
- `consumeClientTicket` distinguishes `1001` from `1002`
- `signClientAccessToken` uses `BETTER_AUTH_SECRET`

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test lib/auth/client-ticket-store.test.ts lib/auth/client-token.test.ts`
Expected: FAIL because production implementations are still missing.

**Step 3: Write minimal implementation**

Implement [client-token.ts](/Users/syx/WebstormProjects/Nexty-template/nexty.dev-cf-pg/lib/auth/client-token.ts):
- a normalized `ClientTokenUser` type
- `signClientAccessToken({ user, secret, now, expiresInSeconds })`
- use `jose` `SignJWT`
- default `expiresInSeconds` to `600`

Implement [client-ticket-store.ts](/Users/syx/WebstormProjects/Nexty-template/nexty.dev-cf-pg/lib/auth/client-ticket-store.ts):
- `CLIENT_AUTH_NAMESPACE = "auth_client"`
- `saveClientTicket(...)`
- `consumeClientTicket(...)`
- a transaction-backed consume path using Drizzle
- small helpers for pending/expired_or_consumed responses

Suggested consume result shape:

```ts
type ClientTicketConsumeResult =
  | { code: 0; message: "ok"; data: { client_id: string; access_token: string; token_type: "Bearer" } }
  | { code: 1001; message: "pending"; data: null }
  | { code: 1002; message: "expired_or_consumed"; data: null };
```

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test lib/auth/client-ticket-store.test.ts lib/auth/client-token.test.ts`
Expected: PASS

**Step 5: Verify TypeScript**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0

**Step 6: Commit**

```bash
git add lib/auth/client-token.ts lib/auth/client-ticket-store.ts lib/auth/client-token.test.ts lib/auth/client-ticket-store.test.ts
git commit -m "feat: add client auth token signer and ticket store"
```

### Task 4: Add API route tests and validation helpers

**Files:**
- Create: `lib/auth/client-auth-request.ts`
- Create: `lib/auth/client-auth-request.test.ts`

**Step 1: Write the failing test**

Create `lib/auth/client-auth-request.test.ts` covering:
- valid `client_id` passes normalization
- empty `client_id` is rejected
- too-long `client_id` is rejected
- too-long `redirect_uri` is rejected
- absolute origins and extension origins return a target origin
- opaque values like `figma-plugin` fall back to `"*"`

Example:

```ts
test("returns star target for opaque redirect sources", () => {
  assert.equal(resolveClientAuthTargetOrigin("figma-plugin"), "*");
});
```

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test lib/auth/client-auth-request.test.ts`
Expected: FAIL because the validation helpers do not exist.

**Step 3: Write minimal implementation**

Implement [client-auth-request.ts](/Users/syx/WebstormProjects/Nexty-template/nexty.dev-cf-pg/lib/auth/client-auth-request.ts):
- request input types
- `parseClientAuthParams`
- `parseClientAuthBody`
- `resolveClientAuthTargetOrigin`

Keep the helpers framework-agnostic so both routes and the page can reuse them.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test lib/auth/client-auth-request.test.ts`
Expected: PASS

**Step 5: Verify TypeScript**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0

**Step 6: Commit**

```bash
git add lib/auth/client-auth-request.ts lib/auth/client-auth-request.test.ts
git commit -m "feat: add client auth request validation helpers"
```

### Task 5: Implement the create-session and poll routes

**Files:**
- Create: `app/api/auth/client/route.ts`
- Create: `app/api/auth/client/session/route.ts`
- Modify: `lib/api-response.ts`

**Step 1: Write the failing test**

Use route-adjacent logic tests first:
- extend `lib/auth/client-ticket-store.test.ts` if response shape helpers are missing
- optionally add `lib/auth/client-auth-route.test.ts` if you want pure function coverage for route handler branches

At minimum, cover:
- unauthenticated `POST /api/auth/client/session` returns `401`
- authenticated session writes a ticket and returns `code: 0`
- `GET /api/auth/client` returns `1001`, `1002`, or `0` with the agreed payload

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test lib/auth/client-ticket-store.test.ts lib/auth/client-auth-request.test.ts`
Expected: FAIL because the routes do not yet connect the helpers and store.

**Step 3: Write minimal implementation**

Implement [session route](/Users/syx/WebstormProjects/Nexty-template/nexty.dev-cf-pg/app/api/auth/client/session/route.ts):
- parse JSON body
- require `getSession()`
- map the Better Auth session user to the JWT payload
- sign the JWT
- save the ticket
- return `{ code: 0, message: "ok" }`

Implement [poll route](/Users/syx/WebstormProjects/Nexty-template/nexty.dev-cf-pg/app/api/auth/client/route.ts):
- read `client_id` from search params
- validate input
- call `consumeClientTicket`
- return the exact polling payload shape

If [api-response.ts](/Users/syx/WebstormProjects/Nexty-template/nexty.dev-cf-pg/lib/api-response.ts) makes these response shapes awkward, add a minimal helper without changing existing API semantics globally.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test lib/auth/client-ticket-store.test.ts lib/auth/client-token.test.ts lib/auth/client-auth-request.test.ts`
Expected: PASS

**Step 5: Verify TypeScript**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0

**Step 6: Commit**

```bash
git add app/api/auth/client/route.ts app/api/auth/client/session/route.ts lib/api-response.ts
git commit -m "feat: add client auth polling routes"
```

### Task 6: Reuse the login UI in a dedicated client-auth page

**Files:**
- Create: `app/[locale]/(basic-layout)/client-auth/signin/page.tsx`
- Create: `app/[locale]/(basic-layout)/client-auth/signin/ClientAuthSigninPage.tsx`
- Modify: `components/auth/LoginForm.tsx`

**Step 1: Write the failing test**

Because the existing UI layer has no browser test harness in this repo, write focused logic tests if you extract page helpers. Otherwise use the red state from manual type-level integration:
- the page can read `client_id` and `redirect_uri`
- the page suppresses the default post-login redirect
- after session exists, it posts to `/api/auth/client/session`
- after success, it renders the success copy and posts `client:auth_success`

If needed, add a pure helper test file:
- Create: `app/[locale]/(basic-layout)/client-auth/signin/client-auth-page.test.ts`

**Step 2: Run test to verify it fails**

Run: `pnpm exec tsc --noEmit`
Expected: FAIL after introducing page/component references that are not implemented yet.

**Step 3: Write minimal implementation**

Add the client-auth page and keep existing `/login` untouched.

Modify [LoginForm.tsx](/Users/syx/WebstormProjects/Nexty-template/nexty.dev-cf-pg/components/auth/LoginForm.tsx) minimally:
- add an optional prop such as:

```ts
type LoginFormProps = {
  className?: string;
  onSignedIn?: () => void | Promise<void>;
  suppressDefaultRedirect?: boolean;
};
```

- keep current default behavior when these props are absent
- for OTP and social sign-in success, call `onSignedIn` when `suppressDefaultRedirect` is true instead of redirecting to the callback URL

Implement the client-auth page flow:
- validate query params
- render `LoginForm`
- once session exists, call `POST /api/auth/client/session`
- show `登录成功，请关闭页面`
- send postMessage to `window.opener` and `window.parent`

**Step 4: Run test to verify it passes**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0

**Step 5: Manually verify in dev**

Run: `pnpm dev`
Manual check:
- open `/client-auth/signin?client_id=abc&redirect_uri=figma-plugin`
- sign in
- confirm the success page appears
- confirm the network request to `POST /api/auth/client/session` succeeds

**Step 6: Commit**

```bash
git add app/[locale]/(basic-layout)/client-auth/signin/page.tsx app/[locale]/(basic-layout)/client-auth/signin/ClientAuthSigninPage.tsx components/auth/LoginForm.tsx
git commit -m "feat: add client auth sign-in page"
```

### Task 7: Verify end-to-end behavior and clean up

**Files:**
- Modify: `docs/plans/2026-03-07-client-auth-design.md` (only if implementation changed the validated design)
- Modify: `docs/plans/2026-03-07-client-auth.md` (only if implementation notes need correction)

**Step 1: Run focused tests**

Run: `node --import tsx --test lib/auth/client-ticket-store.test.ts lib/auth/client-token.test.ts lib/auth/client-auth-request.test.ts`
Expected: PASS

**Step 2: Run type-check**

Run: `pnpm exec tsc --noEmit`
Expected: exit code 0

**Step 3: Run lint if available**

Run: `pnpm lint`
Expected: exit code 0 or document any pre-existing issues.

**Step 4: Manual flow verification**

Run: `pnpm dev`

Manual scenario:
1. Open `/client-auth/signin?client_id=abc`
2. Sign in with an existing account
3. Poll `GET /api/auth/client?client_id=abc`
4. Confirm the first read returns `code: 0`
5. Confirm the second read returns `code: 1002`
6. Repeat with a fresh login and confirm overwrite behavior works for the same `client_id`

**Step 5: Commit**

```bash
git add .
git commit -m "feat: complete client auth ticket flow"
```
