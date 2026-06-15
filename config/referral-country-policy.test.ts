import assert from "node:assert/strict";
import test from "node:test";

import { resolveFreeCreditAmountByCountry } from "@/config/referral";

test("keeps full free credits for countries outside limited and blocked policies", () => {
  assert.equal(resolveFreeCreditAmountByCountry(30, "US"), 30);
});

test("halves free credits for limited-policy countries", () => {
  assert.equal(resolveFreeCreditAmountByCountry(30, "IN"), 15);
});

test("removes free credits for blocked-policy countries", () => {
  assert.equal(
    resolveFreeCreditAmountByCountry(30, "ZZ", {
      limited: [],
      blocked: ["ZZ"],
    }),
    0
  );
});

test("defaults to full credits when country is missing or unknown", () => {
  assert.equal(resolveFreeCreditAmountByCountry(30, null), 30);
  assert.equal(resolveFreeCreditAmountByCountry(30, "XX"), 30);
});
