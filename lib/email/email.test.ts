import assert from "node:assert/strict";
import test from "node:test";
import {
  deliverEmail,
  getEmailProviderConfig,
  type EmailPayload,
} from "./providers";
import { redactEmailLog } from "./redact";

const email: EmailPayload = {
  to: "recipient@example.com",
  fromEmail: "sender@example.com",
  fromName: "Example",
  subject: "Welcome",
  html: "<p>Hello</p>",
  text: "Hello",
  idempotencyKey: "job:recipient",
};
const cloudflare = {
  provider: "cloudflare" as const,
  apiKey: "test-token",
  accountId: "a".repeat(32),
};
const resend = { provider: "resend" as const, apiKey: "test-resend" };
const response = (body: unknown, status = 200) =>
  (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

test("provider configuration selects only the explicit provider and retains Resend defaults", () => {
  assert.equal(
    getEmailProviderConfig({ RESEND_API_KEY: "existing" }).provider,
    "resend",
  );
  assert.equal(
    getEmailProviderConfig({
      EMAIL_PROVIDER: "cloudflare",
      CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
      CLOUDFLARE_EMAIL_API_TOKEN: "cf",
    }).provider,
    "cloudflare",
  );
  assert.throws(
    () =>
      getEmailProviderConfig({
        EMAIL_PROVIDER: "cloudflare",
        RESEND_API_KEY: "existing",
      }),
    /CLOUDFLARE/,
  );
  assert.throws(
    () =>
      getEmailProviderConfig({
        EMAIL_PROVIDER: "invalid",
        RESEND_API_KEY: "existing",
      }),
    /EMAIL_PROVIDER/,
  );
});

test("Resend sends rendered content and the idempotency key, and retains its message ID", async () => {
  const result = await deliverEmail(resend, email, (async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(
      new Headers(options?.headers).get("Idempotency-Key"),
      email.idempotencyKey,
    );
    const payload = JSON.parse(options?.body as string);
    assert.equal(payload.from, "Example <sender@example.com>");
    assert.equal(payload.html, email.html);
    assert.equal(payload.text, email.text);
    return new Response(JSON.stringify({ id: "resend-message" }));
  }) as typeof fetch);
  assert.equal(result.status, "sent");
  assert.equal(result.providerMessageId, "resend-message");
  assert.equal(result.deliveryStatus, null);
});

test("Cloudflare uses the account REST endpoint and structured sender", async () => {
  const result = await deliverEmail(cloudflare, email, (async (
    url,
    options,
  ) => {
    assert.equal(
      url,
      `https://api.cloudflare.com/client/v4/accounts/${cloudflare.accountId}/email/sending/send`,
    );
    assert.equal(
      new Headers(options?.headers).get("Authorization"),
      "Bearer test-token",
    );
    assert.equal(new Headers(options?.headers).get("Idempotency-Key"), null);
    assert.deepEqual(JSON.parse(options?.body as string).from, {
      address: email.fromEmail,
      name: email.fromName,
    });
    return new Response(
      JSON.stringify({
        success: true,
        result: { message_id: "cf-message", delivered: [email.to] },
      }),
    );
  }) as typeof fetch);
  assert.equal(result.status, "sent");
  assert.equal(result.providerMessageId, "cf-message");
  assert.equal(result.deliveryStatus, "delivered");
});

test("Cloudflare can confirm queueing even when the response has no message ID", async () => {
  const result = await deliverEmail(
    cloudflare,
    email,
    response({ success: true, result: { queued: [email.to] } }),
  );
  assert.equal(result.status, "sent");
  assert.equal(result.deliveryStatus, "queued");
  assert.equal(result.providerMessageId, null);
});

test("Cloudflare HTTP success still records recipient bounces and suppressions as failures", async () => {
  for (const [field, status] of [
    ["permanent_bounces", "bounced"],
    ["suppressed_recipients", "suppressed"],
  ]) {
    const result = await deliverEmail(
      cloudflare,
      email,
      response({
        success: true,
        result: { message_id: "cf", [field]: [email.to] },
      }),
    );
    assert.equal(result.status, "failed");
    assert.equal(result.deliveryStatus, status);
    assert.equal(result.providerMessageId, "cf");
  }
});

test("provider validation errors preserve useful failure information", async () => {
  const rs = await deliverEmail(
    resend,
    email,
    response(
      { name: "validation_error", message: "Sender domain is not verified" },
      422,
    ),
  );
  assert.equal(rs.status, "failed");
  assert.match(rs.errorMessage!, /Sender domain/);
  const cf = await deliverEmail(
    cloudflare,
    email,
    response(
      {
        success: false,
        errors: [{ code: 10105, message: "Account is not entitled" }],
      },
      403,
    ),
  );
  assert.equal(cf.status, "failed");
  assert.match(cf.errorMessage!, /10105/);
});

test("malformed, incomplete and server-error responses remain unconfirmed", async () => {
  assert.equal(
    (await deliverEmail(resend, email, response({}, 200))).status,
    "unknown",
  );
  assert.equal(
    (
      await deliverEmail(
        cloudflare,
        email,
        response({
          success: true,
          result: { delivered: ["someone-else@example.com"] },
        }),
      )
    ).status,
    "unknown",
  );
  assert.equal(
    (await deliverEmail(resend, email, response({}, 503))).status,
    "unknown",
  );
});

test("a network failure never retries and never persists the transport exception", async () => {
  let calls = 0;
  const result = await deliverEmail(cloudflare, email, (async () => {
    calls++;
    throw new Error("Secret header or request body must not be logged");
  }) as typeof fetch);
  assert.equal(calls, 1);
  assert.equal(result.status, "unknown");
  assert.doesNotMatch(result.errorMessage!, /Secret header/);
});

test("OTP is removed from variables, subject and provider errors without mutating the email", () => {
  const input = {
    otp: "123456",
    type: "sign-in",
    subject: "Code: 123456",
    nested: { password: "dont-store" },
  };
  const snapshot = redactEmailLog("otp-code-email", input);
  assert.equal(snapshot.variables.otp, "[REDACTED]");
  assert.equal(snapshot.variables.subject, "Code: [REDACTED]");
  assert.equal(
    snapshot.redactText("Invalid code 123456"),
    "Invalid code [REDACTED]",
  );
  assert.doesNotMatch(JSON.stringify(snapshot.variables), /123456|dont-store/);
  assert.equal(input.otp, "123456");
});

test("magic links and unsubscribe tokens are redacted, ordinary business variables remain", () => {
  const input = {
    url: "https://example.com/auth?token=secret-token",
    name: "User",
    count: 10,
  };
  const snapshot = redactEmailLog("magic-link-email", input);
  assert.equal(snapshot.variables.url, "[REDACTED]");
  assert.equal(snapshot.variables.count, 10);
  assert.equal(snapshot.redactText("token=secret-token"), "token=[REDACTED]");
  const welcome = redactEmailLog("user-welcome", {
    name: "User",
    unsubscribeLink: "https://example.com/unsubscribe?token=unsubscribe-secret",
  });
  assert.equal(welcome.variables.name, "User");
  assert.doesNotMatch(JSON.stringify(welcome.variables), /unsubscribe-secret/);
});
