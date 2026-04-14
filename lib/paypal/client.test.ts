import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

async function importPayPalClientModule() {
  const moduleUrl = `${pathToFileURL(
    path.join(process.cwd(), "lib/paypal/client.ts"),
  ).href}?t=${Date.now()}-${Math.random()}`;

  return import(moduleUrl);
}

test("PayPalClient uses live api when PAY_ENV is live", async () => {
  const originalPayEnv = process.env.PAY_ENV;
  const originalClientId = process.env.PAYPAL_CLIENT_ID;
  const originalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  process.env.PAY_ENV = "live";
  process.env.PAYPAL_CLIENT_ID = "client-id";
  process.env.PAYPAL_CLIENT_SECRET = "client-secret";

  globalThis.fetch = (async (input: string | URL | Request) => {
    calls.push(String(input));

    return new Response(JSON.stringify({ access_token: "token", expires_in: 300 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const { PayPalClient } = await importPayPalClientModule();
    const client = new PayPalClient();

    await client.getAccessToken();

    assert.equal(calls.length, 1);
    assert.match(calls[0], /^https:\/\/api-m\.paypal\.com\/v1\/oauth2\/token$/);
  } finally {
    process.env.PAY_ENV = originalPayEnv;
    if (originalClientId === undefined) {
      delete process.env.PAYPAL_CLIENT_ID;
    } else {
      process.env.PAYPAL_CLIENT_ID = originalClientId;
    }
    if (originalClientSecret === undefined) {
      delete process.env.PAYPAL_CLIENT_SECRET;
    } else {
      process.env.PAYPAL_CLIENT_SECRET = originalClientSecret;
    }
    globalThis.fetch = originalFetch;
  }
});
