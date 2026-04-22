import assert from "node:assert/strict";
import test from "node:test";

import {
  parseClientAuthBody,
  parseClientAuthParams,
  resolveClientAuthTargetOrigin,
} from "@/lib/auth/client-auth-request";

test("accepts a valid client auth query", () => {
  const result = parseClientAuthParams(
    new URLSearchParams({
      client_id: "client-123",
      redirect_uri: "chrome-extension://abcdefghijklmnop",
    }),
  );

  assert.deepEqual(result, {
    clientId: "client-123",
    redirectUri: "chrome-extension://abcdefghijklmnop",
  });
});

test("rejects an empty client id", () => {
  assert.throws(
    () => parseClientAuthParams(new URLSearchParams({ client_id: "   " })),
    /client_id/i,
  );
});

test("rejects a client id that exceeds the maximum length", () => {
  assert.throws(
    () =>
      parseClientAuthBody({
        client_id: "a".repeat(129),
      }),
    /client_id/i,
  );
});

test("rejects a redirect uri that exceeds the maximum length", () => {
  assert.throws(
    () =>
      parseClientAuthBody({
        client_id: "client-123",
        redirect_uri: "a".repeat(1025),
      }),
    /redirect_uri/i,
  );
});

test("uses an absolute web origin as the postMessage target", () => {
  assert.equal(
    resolveClientAuthTargetOrigin("https://example.com/path/to/page"),
    "https://example.com",
  );
});

test("uses an extension origin as the postMessage target", () => {
  assert.equal(
    resolveClientAuthTargetOrigin("chrome-extension://abcdefghijklmnop"),
    "chrome-extension://abcdefghijklmnop",
  );
});

test("falls back to star for opaque caller identifiers", () => {
  assert.equal(resolveClientAuthTargetOrigin("figma-plugin"), "*");
});
