import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render } from "@react-email/render";
import {
  FounderRecallEmail,
  getRecallSubject,
  type FounderRecallEmailProps,
} from "@/emails/founder-recall";
import {
  calculateRecallPurchaseBonusCredits,
  getRecallStep,
  getFounderIdentity,
  getRecallIdempotencyKey,
  getRecallPurchaseBonusConfig,
  resolveRecallPurchaseBonusOffer,
  type RecallState,
} from "./rules";
import { readRecallAttachment } from "./attachment";

const origin = new Date("2026-09-15T00:00:00Z");
const after = (hours: number) => new Date(origin.getTime() + hours * 3_600_000);
const state: RecallState = {
  registeredAt: origin,
  checkoutAt: null,
  paidAt: null,
  hasPurchased: false,
  paymentRefunded: false,
  hasSubscription: false,
  paymentProcessing: false,
  hasPendingCheckout: false,
  paused: false,
  eligible: true,
};

test("signup steps honor exact boundaries and skip stale steps after downtime", () => {
  assert.equal(getRecallStep(state, after(1.99), origin), null);
  assert.equal(getRecallStep(state, after(2), origin), "signup-help");
  assert.equal(getRecallStep(state, after(24), origin), "signup-bonus");
  assert.equal(getRecallStep(state, after(72), origin), null);
  assert.equal(getRecallStep(state, after(24), after(1)), null);
});

test("checkout supersedes signup and repeated orders do not change the step identity", () => {
  const checkout = { ...state, checkoutAt: after(1), hasPendingCheckout: true };
  assert.equal(getRecallStep(checkout, after(1.99), origin), null);
  assert.equal(getRecallStep(checkout, after(2), origin), "checkout-help");
  assert.equal(getRecallStep(checkout, after(7), origin), "checkout-bonus");
  assert.equal(getRecallStep(checkout, after(49), origin), null);
  assert.equal(
    getRecallStep(
      { ...checkout, hasPendingCheckout: false },
      after(24),
      origin,
    ),
    null,
  );
  assert.equal(
    getRecallIdempotencyKey("user", "checkout-help"),
    "recall:user:checkout-help",
  );
});

test("payment cancels both unpaid flows and anchors the care email to payment confirmation", () => {
  const paid = {
    ...state,
    checkoutAt: origin,
    hasPurchased: true,
    paidAt: after(5),
    hasSubscription: true,
  };
  assert.equal(getRecallStep(paid, after(5.99), origin), null);
  assert.equal(getRecallStep(paid, after(6), origin), "paid-help");
  assert.equal(
    getRecallStep({ ...paid, paymentRefunded: true }, after(6), origin),
    null,
  );
  assert.equal(
    getRecallStep({ ...paid, paidAt: null }, after(6), origin),
    null,
  );
  assert.equal(
    getRecallStep({ ...paid, paused: true }, after(6), origin),
    null,
  );
});

test("trialing, processing, unverified, paused and historical users receive no prospect email", () => {
  for (const patch of [
    { hasSubscription: true },
    { paymentProcessing: true },
    { eligible: false },
    { paused: true },
  ]) {
    assert.equal(
      getRecallStep({ ...state, ...patch }, after(24), origin),
      null,
    );
  }
});

test("founder defaults derive from the site hostname and allow explicit overrides", () => {
  assert.deepEqual(
    getFounderIdentity("https://www.example.co.uk:8443/path", {}),
    { name: "Jame", email: "jame@example.co.uk" },
  );
  assert.deepEqual(
    getFounderIdentity("https://product.example.com", {
      RECALL_FOUNDER_NAME: " Jane ",
      RECALL_FOUNDER_EMAIL: "jane@example.com",
    }),
    { name: "Jane", email: "jane@example.com" },
  );
  assert.throws(() => getFounderIdentity("http://localhost:3000", {}));
  assert.throws(() =>
    getFounderIdentity("https://example.com", {
      RECALL_FOUNDER_NAME: "Jame\r\nBcc:other@example.com",
    }),
  );
});

test("purchase bonus defaults, validation, credit calculation and expiry are deterministic", () => {
  assert.deepEqual(getRecallPurchaseBonusConfig({}), {
    percent: 20,
    validHours: 72,
  });
  assert.deepEqual(
    getRecallPurchaseBonusConfig({
      RECALL_PURCHASE_BONUS_PERCENT: "25",
      RECALL_PURCHASE_BONUS_VALID_HOURS: "48",
    }),
    { percent: 25, validHours: 48 },
  );
  assert.throws(() =>
    getRecallPurchaseBonusConfig({ RECALL_PURCHASE_BONUS_PERCENT: "0" }),
  );
  assert.equal(calculateRecallPurchaseBonusCredits(999, 20), 199);
  assert.deepEqual(
    resolveRecallPurchaseBonusOffer({
      variables: { bonusPercent: 20, bonusValidHours: 72 },
      sentAt: origin,
      paidAt: after(72),
    }),
    { percent: 20, validHours: 72 },
  );
  assert.equal(
    resolveRecallPurchaseBonusOffer({
      variables: { bonusPercent: 20, bonusValidHours: 72 },
      sentAt: origin,
      paidAt: after(72.01),
    }),
    null,
  );
});

test("missing or invalid PDF is optional; a real PDF becomes a base64 attachment", async () => {
  const root = await mkdtemp(join(tmpdir(), "recall-attachment-"));
  try {
    assert.equal(await readRecallAttachment(root), undefined);
    await mkdir(join(root, "public/emails"), { recursive: true });
    await writeFile(join(root, "public/emails/product-guide.pdf"), "not a pdf");
    assert.equal(await readRecallAttachment(root), undefined);
    const content = "%PDF-1.7\nfixture";
    await writeFile(join(root, "public/emails/product-guide.pdf"), content);
    const attachments = await readRecallAttachment(root);
    assert.equal(
      Buffer.from(attachments![0].content, "base64").toString(),
      content,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("all five emails render with product-neutral bonus terms and conditional attachment copy", async () => {
  const base: FounderRecallEmailProps = {
    step: "signup-help",
    name: "<customer>",
    founderName: "Jame",
    founderEmail: "jame@example.com",
    productName: "JsonTranslate",
    productDescription: "Translate your localization files.",
    siteUrl: "https://example.com",
    pricingUrl: "https://example.com/pricing",
    hasAttachment: false,
    bonusPercent: 20,
    bonusValidHours: 72,
  };
  for (const step of [
    "checkout-help",
    "checkout-bonus",
    "paid-help",
    "signup-help",
    "signup-bonus",
  ] as const) {
    const html = await render(<FounderRecallEmail {...base} step={step} />);
    assert.match(html, /JsonTranslate/);
    assert.match(html, /&lt;customer&gt;/);
    assert.doesNotMatch(html, /attached|Sdance|video/i);
    if (step.endsWith("-bonus")) {
      assert.match(html, /20.*% bonus credits/);
      assert.match(html, /No coupon code is needed/);
    }
    assert.match(
      getRecallSubject(step, base.productName, base.bonusPercent),
      /JsonTranslate/,
    );
  }
  assert.match(
    await render(<FounderRecallEmail {...base} hasAttachment />),
    /attached/,
  );
});
