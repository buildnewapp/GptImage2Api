import assert from "node:assert/strict";
import test from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { captcha } from "better-auth/plugins";
import { emailPassword, isSocialSignup } from "@/lib/auth/email-password";

function createTestAuth(enabled = true, protectWithCaptcha = false) {
  const database: Record<string, any[]> = {
    user: [],
    account: [],
    session: [],
    verification: [],
  };
  const codes = new Map<string, string>();
  const awardedUsers: string[] = [];
  const verifiedUsers: string[] = [];
  const auth = betterAuth({
    baseURL: "http://localhost:3000",
    secret: "test-only-email-password-secret-at-least-32-characters",
    database: memoryAdapter(database),
    rateLimit: { enabled: false },
    logger: { disabled: true },
    socialProviders: {
      google: {
        clientId: "test-google-client",
        clientSecret: "test-google-secret",
        verifyIdToken: async () => true,
        getUserInfo: async () => ({
          user: {
            id: "test-google-user",
            email,
            name: "Google User",
            emailVerified: true,
          },
          data: {},
        }),
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user, ctx) => {
            if (isSocialSignup(ctx?.path)) awardedUsers.push(user.id);
          },
        },
      },
    },
    plugins: [
      ...(protectWithCaptcha
        ? [
            captcha({
              provider: "cloudflare-turnstile",
              secretKey: "test-captcha-secret",
            }),
          ]
        : []),
      emailPassword({
        enabled,
        sendVerificationOTP: async ({ email, otp }) => {
          codes.set(email, otp);
        },
        onPasswordReset: async ({ user }) => {
          if (!user.emailVerified) verifiedUsers.push(user.id);
        },
      }),
    ],
  });

  async function request(
    path: string,
    body: Record<string, unknown>,
    token?: string,
  ) {
    return auth.handler(
      new Request(`http://localhost:3000/api/auth${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          ...(token ? { "x-captcha-response": token } : {}),
        },
        body: JSON.stringify(body),
      }),
    );
  }
  return { auth, database, codes, awardedUsers, verifiedUsers, request };
}

const email = "new-user@gmail.com";
const password = "test-password-123";

test("email signup requires verification before login and never grants signup credits", async () => {
  const app = createTestAuth();
  const signup = await app.request("/sign-up/email", {
    email,
    password,
    name: "New User",
  });
  assert.equal(signup.status, 200, await signup.clone().text());
  assert.equal((await signup.json()).token, null);
  assert.ok(app.codes.get(email));
  assert.equal(app.database.user.length, 1);
  assert.equal(app.database.user[0].emailVerified, false);
  assert.equal(app.database.session.length, 0);
  assert.deepEqual(app.awardedUsers, []);
  assert.deepEqual(app.verifiedUsers, []);

  const beforeVerification = await app.request("/sign-in/email", {
    email,
    password,
  });
  assert.equal(beforeVerification.status, 403);
  assert.equal((await beforeVerification.json()).code, "EMAIL_NOT_VERIFIED");

  const reset = await app.request("/email-otp/reset-password", {
    email,
    password,
    otp: app.codes.get(email),
  });
  assert.equal(reset.status, 200, await reset.clone().text());
  assert.equal(app.database.user[0].emailVerified, true);
  assert.equal(app.database.session.length, 0);
  assert.deepEqual(app.verifiedUsers, [app.database.user[0].id]);

  const login = await app.request("/sign-in/email", { email, password });
  assert.equal(login.status, 200, await login.clone().text());
  assert.ok(login.headers.get("set-cookie")?.includes("session_token"));
  assert.deepEqual(app.awardedUsers, []);
  assert.equal(app.database.user.length, 1);
});

test("an existing Google user can verify the same email to add a password without creating another user", async () => {
  const app = createTestAuth();
  const ctx = await app.auth.$context;
  const user = await ctx.internalAdapter.createUser({
    email,
    name: "Google User",
    emailVerified: true,
  });
  await ctx.internalAdapter.createAccount({
    userId: user.id,
    providerId: "google",
    accountId: "google-id",
  });
  const signup = await app.request("/sign-up/email", {
    email,
    password,
    name: "Should not replace",
  });
  assert.equal(signup.status, 200, await signup.clone().text());
  assert.ok(app.codes.get(email));
  assert.equal(app.database.account.length, 1);
  assert.equal(app.database.session.length, 0);

  const wrong = await app.request("/email-otp/reset-password", {
    email,
    password,
    otp: "wrong",
  });
  assert.equal(wrong.status, 400);
  assert.equal(app.database.account.length, 1);
  const reset = await app.request("/email-otp/reset-password", {
    email,
    password,
    otp: app.codes.get(email),
  });
  assert.equal(reset.status, 200, await reset.clone().text());
  assert.equal(app.database.user.length, 1);
  assert.equal(app.database.user[0].id, user.id);
  assert.equal(app.database.user[0].name, "Google User");
  assert.equal(
    app.database.account.filter((a) => a.providerId === "google").length,
    1,
  );
  const credential = app.database.account.find(
    (a) => a.providerId === "credential",
  );
  assert.equal(credential.userId, user.id);
  assert.ok(await verifyPassword({ hash: credential.password, password }));
  assert.deepEqual(app.awardedUsers, []);
  assert.deepEqual(app.verifiedUsers, []);
  assert.equal(
    (await app.request("/sign-in/email", { email, password })).status,
    200,
  );
});

test("wrong password opens the verification path without changing the account until a valid single-use code is supplied", async () => {
  const app = createTestAuth();
  const ctx = await app.auth.$context;
  const user = await ctx.internalAdapter.createUser({
    email,
    name: "Existing User",
    emailVerified: true,
  });
  await ctx.internalAdapter.createAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await hashPassword(password),
  });
  const oldSession = await ctx.internalAdapter.createSession(user.id);
  const nextPassword = "replacement-password-456";
  const wrongLogin = await app.request("/sign-in/email", {
    email,
    password: nextPassword,
  });
  assert.equal(wrongLogin.status, 401);
  assert.equal((await wrongLogin.json()).code, "INVALID_EMAIL_OR_PASSWORD");
  await app.request("/sign-up/email", {
    email,
    password: nextPassword,
    name: "Existing",
  });
  const code = app.codes.get(email);
  assert.equal(
    (
      await app.request("/email-otp/reset-password", {
        email: "different-user@gmail.com",
        password,
        otp: code,
      })
    ).status,
    400,
  );
  assert.ok(
    await verifyPassword({ hash: app.database.account[0].password, password }),
  );
  const reset = await app.request("/email-otp/reset-password", {
    email,
    password: nextPassword,
    otp: code,
  });
  assert.equal(reset.status, 200, await reset.clone().text());
  assert.equal(
    app.database.session.find((s) => s.id === oldSession.id),
    undefined,
  );
  assert.equal(
    (
      await app.request("/email-otp/reset-password", {
        email,
        password,
        otp: code,
      })
    ).status,
    400,
  );
  assert.equal(
    (await app.request("/sign-in/email", { email, password })).status,
    401,
  );
  assert.equal(
    (await app.request("/sign-in/email", { email, password: nextPassword }))
      .status,
    200,
  );
});

test("codes are bound to the email and stop working after repeated failures", async () => {
  const app = createTestAuth();
  await app.request("/sign-up/email", { email, password, name: "New" });
  const code = app.codes.get(email);
  const otherEmail = "other-user@gmail.com";
  await app.request("/sign-up/email", {
    email: otherEmail,
    password,
    name: "Other",
  });
  for (let i = 0; i < 3; i++) {
    assert.equal(
      (
        await app.request("/email-otp/reset-password", {
          email,
          password,
          otp: "wrong",
        })
      ).status,
      400,
    );
  }
  assert.equal(
    (
      await app.request("/email-otp/reset-password", {
        email,
        password,
        otp: code,
      })
    ).status,
    403,
  );
  assert.equal(
    app.database.user.every((user) => !user.emailVerified),
    true,
  );
  assert.equal(app.database.session.length, 0);
});

test("disabled email login and removed passwordless endpoints cannot create a session", async () => {
  for (const enabled of [true, false]) {
    const app = createTestAuth(enabled);
    assert.equal(
      (await app.request("/sign-in/email-otp", { email, otp: "123456" }))
        .status,
      404,
    );
    assert.equal(
      (await app.request("/email-otp/verify-email", { email, otp: "123456" }))
        .status,
      404,
    );
    if (!enabled) {
      assert.equal(
        (await app.request("/sign-up/email", { email, password, name: "New" }))
          .status,
        400,
      );
      assert.equal(
        (
          await app.request("/email-otp/reset-password", {
            email,
            password,
            otp: "123456",
          })
        ).status,
        404,
      );
      assert.equal(app.codes.size, 0);
      assert.equal(app.database.user.length, 0);
    }
  }
});

test("invalid registration input does not send mail or create a user", async () => {
  const app = createTestAuth();
  assert.equal(
    (
      await app.request("/sign-up/email", {
        email: "user@example.com",
        password,
        name: "New",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await app.request("/sign-up/email", {
        email,
        password: "short",
        name: "New",
      })
    ).status,
    400,
  );
  assert.equal(app.codes.size, 0);
  assert.equal(app.database.user.length, 0);
});

test("signup bonus eligibility is limited to server-side social signup routes", () => {
  for (const path of [
    "/callback/google",
    "/callback/:id",
    "/sign-in/social",
    "/one-tap/callback",
  ]) {
    assert.equal(isSocialSignup(path), true);
  }
  for (const path of [
    undefined,
    "/sign-up/email",
    "/email-otp/reset-password",
    "/sign-in/email-otp",
    "/magic-link/verify",
  ]) {
    assert.equal(isSocialSignup(path), false);
  }
});

test("expired verification codes cannot activate an account", async () => {
  const app = createTestAuth();
  await app.request("/sign-up/email", { email, password, name: "New" });
  for (const verification of app.database.verification)
    verification.expiresAt = new Date(Date.now() - 60_000);
  const response = await app.request("/email-otp/reset-password", {
    email,
    password,
    otp: app.codes.get(email),
  });
  assert.equal(response.status, 400);
  assert.equal(app.database.user[0].emailVerified, false);
  assert.equal(app.database.session.length, 0);
});

test("Google signups still earn signup credits, but linking Google to an email signup does not", async () => {
  const social = createTestAuth();
  const response = await social.request("/sign-in/social", {
    provider: "google",
    idToken: { token: "test-token" },
  });
  assert.equal(response.status, 200, await response.clone().text());
  assert.deepEqual(social.awardedUsers, [social.database.user[0].id]);

  const emailFirst = createTestAuth();
  await emailFirst.request("/sign-up/email", { email, password, name: "New" });
  await emailFirst.request("/email-otp/reset-password", {
    email,
    password,
    otp: emailFirst.codes.get(email),
  });
  const linked = await emailFirst.request("/sign-in/social", {
    provider: "google",
    idToken: { token: "test-token" },
  });
  assert.equal(linked.status, 200, await linked.clone().text());
  assert.equal(emailFirst.database.user.length, 1);
  assert.deepEqual(emailFirst.awardedUsers, []);
});

test("signup consumes one CAPTCHA token and automatic password login uses a fresh token", async (t) => {
  const tokens: string[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      const token = JSON.parse(String(init.body)).response as string;
      const reused = tokens.includes(token);
      tokens.push(token);
      return new Response(JSON.stringify({ success: !reused }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  );
  const app = createTestAuth(true, true);
  const blocked = await app.request("/sign-up/email", {
    email,
    password,
    name: "New",
  });
  assert.equal(blocked.status, 400);
  assert.equal(app.codes.size, 0);
  const signup = await app.request(
    "/sign-up/email",
    { email, password, name: "New" },
    "signup-captcha",
  );
  assert.equal(signup.status, 200, await signup.clone().text());
  assert.deepEqual(tokens, ["signup-captcha"]);
  const reset = await app.request("/email-otp/reset-password", {
    email,
    password,
    otp: app.codes.get(email),
  });
  assert.equal(reset.status, 200);
  assert.equal(app.database.session.length, 0);
  const login = await app.request(
    "/sign-in/email",
    { email, password },
    "fresh-login-captcha",
  );
  assert.equal(login.status, 200, await login.clone().text());
  assert.deepEqual(tokens, ["signup-captcha", "fresh-login-captcha"]);
});
