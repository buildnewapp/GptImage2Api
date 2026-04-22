import assert from "node:assert/strict";
import test from "node:test";

import {
  isLikelyClientAccessToken,
  signClientAccessToken,
  verifyClientAccessToken,
} from "@/lib/auth/client-token";

function decodePayload(token: string) {
  const parts = token.split(".");
  const payload = parts[1];
  if (!payload) {
    throw new Error("JWT payload is missing");
  }

  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    user: {
      uuid: string;
      email: string;
      nickname: string;
      avatar_url: string | null;
      created_at: string;
    };
    iat: number;
    exp: number;
  };
}

test("signs a JWT with the expected user payload", async () => {
  const token = await signClientAccessToken({
    secret: "test-secret",
    user: {
      uuid: "user-1",
      email: "user@example.com",
      nickname: "User One",
      avatar_url: "https://example.com/avatar.png",
      created_at: "2026-03-07T00:00:00.000Z",
    },
    now: new Date("2026-03-07T00:00:00.000Z"),
  });

  const payload = decodePayload(token);

  assert.deepEqual(payload.user, {
    uuid: "user-1",
    email: "user@example.com",
    nickname: "User One",
    avatar_url: "https://example.com/avatar.png",
    created_at: "2026-03-07T00:00:00.000Z",
  });
});

test("defaults the JWT expiry to ten minutes", async () => {
  const token = await signClientAccessToken({
    secret: "test-secret",
    user: {
      uuid: "user-1",
      email: "user@example.com",
      nickname: "User One",
      avatar_url: null,
      created_at: "2026-03-07T00:00:00.000Z",
    },
    now: new Date("2026-03-07T00:00:00.000Z"),
  });

  const payload = decodePayload(token);

  assert.equal(payload.iat, 1772841600);
  assert.equal(payload.exp, 1772842200);
});

test("verifies a signed client access token", async () => {
  const token = await signClientAccessToken({
    secret: "test-secret",
    user: {
      uuid: "user-1",
      email: "user@example.com",
      nickname: "User One",
      avatar_url: null,
      created_at: "2026-03-07T00:00:00.000Z",
    },
    now: new Date("2026-03-07T00:00:00.000Z"),
  });

  const payload = await verifyClientAccessToken({
    token,
    secret: "test-secret",
    now: new Date("2026-03-07T00:01:00.000Z"),
  });

  assert.equal(payload?.user.uuid, "user-1");
  assert.equal(payload?.user.email, "user@example.com");
});

test("rejects an expired client access token", async () => {
  const token = await signClientAccessToken({
    secret: "test-secret",
    user: {
      uuid: "user-1",
      email: "user@example.com",
      nickname: "User One",
      avatar_url: null,
      created_at: "2026-03-07T00:00:00.000Z",
    },
    now: new Date("2026-03-07T00:00:00.000Z"),
    expiresInSeconds: 60,
  });

  const payload = await verifyClientAccessToken({
    token,
    secret: "test-secret",
    now: new Date("2026-03-07T00:01:01.000Z"),
  });

  assert.equal(payload, null);
});

test("rejects a client token with an invalid signature", async () => {
  const token = await signClientAccessToken({
    secret: "test-secret",
    user: {
      uuid: "user-1",
      email: "user@example.com",
      nickname: "User One",
      avatar_url: null,
      created_at: "2026-03-07T00:00:00.000Z",
    },
    now: new Date("2026-03-07T00:00:00.000Z"),
  });

  const tampered = `${token.slice(0, -1)}x`;
  const payload = await verifyClientAccessToken({
    token: tampered,
    secret: "test-secret",
    now: new Date("2026-03-07T00:01:00.000Z"),
  });

  assert.equal(payload, null);
});

test("distinguishes client JWTs from api keys by token shape", () => {
  assert.equal(isLikelyClientAccessToken("sk_123456"), false);
  assert.equal(
    isLikelyClientAccessToken("aaa.bbb.ccc"),
    true,
  );
  assert.equal(isLikelyClientAccessToken("not-a-client-token"), false);
});
