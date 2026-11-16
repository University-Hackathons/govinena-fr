import test from "node:test";
import assert from "node:assert/strict";
import { approximateQuantity, remainingTime, riskSchema } from "../src/features/crop-risk/schema.ts";

test("remaining time uses coarse guidance, including boundaries", () => {
  assert.equal(remainingTime(0), "No selling time remaining");
  assert.equal(remainingTime(3599), "Less than 1 hour remaining");
  assert.equal(remainingTime(3600), "About 1 hour remaining");
  assert.equal(remainingTime(86400), "About 1 day 0 hours remaining");
});
test("unknown quantity differs from zero and avoids false precision", () => {
  assert.match(approximateQuantity(null), /Unknown/);
  assert.equal(approximateQuantity(0), "Approximately 0 kg");
  assert.equal(approximateQuantity(0.4), "Less than 1 kg (assumed)");
  assert.equal(approximateQuantity(93.713), "Approximately 94 kg");
});
const time = "2026-11-16T01:00:00Z";
const data = {
  produce_batch_id: "00000000-0000-4000-8000-000000000001", crop_id: "tomato",
  assessed_at: time, expected_arrival_at: null, evaluated_at: time, harvested_at: time,
  user_deadline: time, remaining_selling_seconds: 100, remaining_at_arrival_seconds: null,
  deadline_status: "open", deadline_eligible: true, alternative_accepted: true, rejection_reason: null,
  urgency: "low", profile_version: null, guidance_status: "missing", guidance_window_hours: null,
  storage_condition: "unknown", quantity_kg: "100.000", estimated_saleable_quantity_kg: null,
  assumed_loss_percent: null, assumptions: ["Not scientifically validated"], formula_version: "crop_risk_v1",
};
test("response parsing retains missing estimates and explicit zero", () => {
  assert.equal(riskSchema.parse(data).estimated_saleable_quantity_kg, null);
  assert.equal(riskSchema.parse({ ...data, estimated_saleable_quantity_kg: "0" }).estimated_saleable_quantity_kg, 0);
  for (const invalid of [{ quantity_kg: null }, { quantity_kg: "NaN" }, { quantity_kg: "" }, { remaining_selling_seconds: -1 }, { urgency: "safe" }, { assessed_at: "2026-11-16T01:00:00" }]) {
    assert.equal(riskSchema.safeParse({ ...data, ...invalid }).success, false);
  }
});
