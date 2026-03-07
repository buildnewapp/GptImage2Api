# Client Auth Ticket Design

**Date:** 2026-03-07

**Goal:** Add a third-party client login flow that lets browser extensions, desktop apps, and embedded clients open a site login page, bind a `client_id` to the signed-in user, and retrieve a one-time access token by polling an API.

## Confirmed Product Rules

- Third-party clients open a dedicated login URL with:
  - `client_id` required
  - `redirect_uri` optional and used only to identify the caller origin
- Example callers include Chrome extensions, native apps, and Figma plugins.
- After the web user signs in, the page must:
  - show `登录成功，请关闭页面`
  - send `client:auth_success` to `window.opener` and `window.parent`
- The polling API is:
  - `GET /api/auth/client?client_id=abc`
- A `client_id` token is one-time read:
  - first successful read returns the token payload
  - the record is then consumed and must be recreated by running login again
- The solution must work on:
  - Cloudflare Workers
  - local development
  - ordinary VPS deployments
- Do not require Redis.
- Reuse `BETTER_AUTH_SECRET` for JWT signing.
- Expired or consumed polling results should be distinguishable from pending results.

## Recommended Architecture

Use a dedicated site flow layered on top of the existing Better Auth session system:

1. a dedicated client-auth sign-in page
2. a database-backed temporary store table named `cache_db`
3. a small service that signs short-lived JWTs for third-party clients
4. a one-time polling endpoint that atomically consumes a stored ticket

This keeps the feature independent from Better Auth internals. The site still owns normal browser sessions, while third-party clients receive a separate short-lived JWT derived from the currently signed-in user.

## Why Database-Backed `cache_db`

`globalThis` or in-memory maps are not reliable on Cloudflare Workers because requests are not guaranteed to hit the same isolate, and memory may be evicted between requests. Workers KV is also a poor fit because this login handshake needs immediate read-after-write consistency.

A database-backed temporary store:

- works the same way on CF, local, and VPS
- preserves one-time read semantics
- avoids new infrastructure dependencies
- stays minimally invasive because only one new table and one small service layer are required

## Data Model

Add a new table `cache_db` for short-lived coordination state, not high-volume caching.

Suggested fields:

- `id`
- `namespace`
- `cacheKey`
- `valueJsonb`
- `expiresAt`
- `consumedAt`
- `createdAt`
- `updatedAt`

Constraints and indexes:

- unique on `namespace + cacheKey`
- index on `expiresAt`
- index on `consumedAt`

Initial namespace:

- `auth_client`

For this feature, `cacheKey` stores `client_id`.

`valueJsonb` should store:

- `client_id`
- `access_token`
- `token_type`
- `user`
- `redirect_uri`

This table is intentionally narrow in purpose: temporary handoff state that values correctness over raw throughput.

## Auth Token Design

The third-party client token is a standalone JWT, not the Better Auth session token.

Signing:

- algorithm: `HS256`
- secret: `BETTER_AUTH_SECRET`
- expiry: 10 minutes by default

Recommended payload:

```json
{
  "user": {
    "uuid": "user-id",
    "email": "user@example.com",
    "nickname": "Display Name",
    "avatar_url": "https://...",
    "created_at": "2025-10-03T06:04:51.125Z"
  },
  "iat": 1760598236,
  "exp": 1761203036
}
```

Notes:

- Keep the payload minimal and user-focused.
- Do not include Better Auth cookie/session internals.
- Reusing `BETTER_AUTH_SECRET` reduces config surface while still separating token semantics from browser sessions.

## Routes and Flow

### 1. Client Auth Page

Add a dedicated page such as:

- `/client-auth/signin?client_id=abc&redirect_uri=figma-plugin`

Behavior:

- validate `client_id`
- if the browser is not signed in, render the existing login UI
- after sign-in succeeds, stay in the client-auth flow instead of redirecting home
- call a server API to create the one-time client ticket
- show `登录成功，请关闭页面`
- send a postMessage event to the opener/parent

`redirect_uri` is not used for redirect navigation. It only identifies the caller and can be used to derive a safer `postMessage` target origin when it is a valid origin-like value.

### 2. Create Ticket API

Add:

- `POST /api/auth/client/session`

Request body:

```json
{
  "client_id": "abc",
  "redirect_uri": "figma-plugin"
}
```

Behavior:

- require an authenticated site session
- validate `client_id` and optional `redirect_uri`
- sign a short-lived JWT from the current user
- upsert into `cache_db` under:
  - `namespace = auth_client`
  - `cacheKey = client_id`
- set `expiresAt` to now + 10 minutes

Response:

```json
{
  "code": 0,
  "message": "ok"
}
```

### 3. Polling API

Add:

- `GET /api/auth/client?client_id=abc`

Response states:

- pending:

```json
{
  "code": 1001,
  "message": "pending",
  "data": null
}
```

- expired or consumed:

```json
{
  "code": 1002,
  "message": "expired_or_consumed",
  "data": null
}
```

- success:

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "client_id": "abc",
    "access_token": "jwt",
    "token_type": "Bearer"
  }
}
```

## One-Time Consumption Semantics

The polling endpoint should consume the ticket atomically:

1. load the `auth_client` row for the `client_id`
2. reject if missing
3. reject with `1001` if no row exists yet
4. reject with `1002` if:
   - `expiresAt <= now`
   - `consumedAt is not null`
5. on success, return the token and mark `consumedAt = now` in the same transaction

This prevents duplicate token reads when multiple polling requests arrive close together.

## UI Integration Strategy

Avoid changing the existing `/login` behavior.

Instead:

- add a dedicated client-auth page
- reuse `LoginForm`
- make a minimal extension to `LoginForm` so the caller can intercept successful sign-in

Recommended extension:

- add an optional callback or mode prop that suppresses the current home-page redirect
- default login behavior remains unchanged outside the client-auth page

This preserves the current site sign-in UX and limits the new behavior to the new flow.

## Validation and Security

- `client_id` required, length limited to 1..128
- `redirect_uri` optional, length limited to 1024
- never use `redirect_uri` as a blind redirect target
- only use it as a message-origin hint
- overwrite any previous live ticket for the same `client_id`
- use a short expiry window
- only signed-in browsers may create client tickets

Recommended postMessage payload:

```ts
{
  type: "client:auth_success",
  client_id,
  redirect_uri,
}
```

If `redirect_uri` parses as an absolute origin or extension origin, send to that exact origin. Otherwise fall back to `"*"`.

## Error Handling

- missing or invalid `client_id`: `400`
- unauthenticated ticket creation: `401`
- malformed JSON body: `400`
- ticket not yet created: `200` with `code: 1001`
- ticket expired or already consumed: `200` with `code: 1002`
- storage or signing failure: `500`

## Testing Strategy

Use focused `node:test` unit coverage for pure logic and service behavior:

- `cache_db` upsert and consumption semantics
- pending vs expired vs consumed state resolution
- one-time read behavior
- new login overwrites previous ticket for the same `client_id`
- JWT payload shape and expiry
- redirect-origin parsing helper

The first implementation can avoid browser E2E coverage if the service and page logic remain small and explicit.

## Out of Scope

- exchanging the returned JWT directly against existing site APIs
- replacing Better Auth session handling
- Redis, Workers KV, or Durable Object variants
- generic high-throughput caching
- OAuth-style third-party app registration and scopes
