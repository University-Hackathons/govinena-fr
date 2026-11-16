import test from "node:test";
import assert from "node:assert/strict";
import { comparisonSchema, uniqueCandidates, additionalFeeSchema, formatComparisonLKR } from "../src/features/comparisons/schema.ts";

test("candidate validation prevents duplicates and empty markets", () => {
  assert.equal(uniqueCandidates(["a", "b"]), true);
  for (const ids of [[], [""], ["a", "a"], Array.from({ length: 21 }, (_, i) => String(i))]) assert.equal(uniqueCandidates(ids), false);
});
test("additional fees validate currency precision and bounds", () => {
  for (const input of ["", "0", "10.50", "1000000000"]) assert.equal(additionalFeeSchema.safeParse(input).success, true);
  for (const input of ["-1", "NaN", "1.001", "1000000001"]) assert.equal(additionalFeeSchema.safeParse(input).success, false);
});
test("LKR formatting retains exact cents and negative proceeds without Number conversion", () => {
  assert.match(formatComparisonLKR("1000000000000000.01"), /1,000,000,000,000,000\.01$/);
  assert.equal(formatComparisonLKR("-10.005"), "LKR -10.01");
  assert.equal(formatComparisonLKR("0"), "LKR 0.00");
  assert.equal(formatComparisonLKR(null), "Not calculated");
});
const base = { snapshot_id: null, produce_batch_id: "00000000-0000-4000-8000-000000000001", assessed_at: "2026-11-16T01:00:00Z", price_type: "wholesale", quality: "", price_max_age_hours: 72, currency: "LKR", formula_version: "market_comparison_v1", snapshot_note: "Not saved", assumptions: [], eligible: [], excluded: [] };
test("empty comparisons are valid and carry exclusions explicitly", () => {
  assert.equal(comparisonSchema.parse(base).eligible.length, 0);
  assert.equal(comparisonSchema.parse({ ...base, excluded: [{ market_id: "a", market_name: "A", code: "price_missing", reason: "Missing is not zero", price: null, transport: null, risk: null }] }).excluded[0].price, null);
  for (const invalid of [{ currency: "USD" }, { price_type: "forecast" }, { price_max_age_hours: 0 }, { assessed_at: "2026-11-16T01:00:00" }]) assert.equal(comparisonSchema.safeParse({ ...base, ...invalid }).success, false);
});
