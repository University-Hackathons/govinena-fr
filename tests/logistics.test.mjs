import test from "node:test";
import assert from "node:assert/strict";
import { defaults, formatLKR, logisticsFormSchema, logisticsPayload, logisticsSchema } from "../src/features/logistics/schema.ts";

const profile = { transport_mode: "hired_vehicle", vehicle_capacity_kg: 500, estimated_transport_rate: 20 };
const valid = { ...defaults(profile), market_id: "dambulla-dec", manual_distance_km: "10" };

test("transport defaults reuse known profile values without inventing a rate or quote", () => {
  assert.equal(valid.vehicle_capacity_kg, "500");
  assert.equal(valid.rate_per_km_lkr, "20");
  assert.equal(defaults(null).rate_per_km_lkr, "");
  assert.equal(defaults(null).known_quote_lkr, "");
  const value = logisticsPayload("00000000-0000-4000-8000-000000000001", logisticsFormSchema.parse(valid));
  assert.equal(value.tariff.rate_per_km_lkr, "20");
  assert.equal(value.known_quote_lkr, null);
  assert.equal(value.manual_distance_km, "10");
});

test("validation rejects bad capacities, monetary values and conflicting return assumptions", () => {
  for (const invalid of [{ vehicle_capacity_kg: "0" }, { vehicle_capacity_kg: "-1" }, { manual_distance_km: "-1" }, { manual_distance_km: "NaN" }, { rate_per_km_lkr: "1.001" }, { toll_lkr: "-1" }, { known_quote_lkr: "500", quote_note: "" }, { pricing_basis: "round_trip", assume_equal_return: true, manual_return_distance_km: "10" }]) {
    assert.equal(logisticsFormSchema.safeParse({ ...valid, ...invalid }).success, false, JSON.stringify(invalid));
  }
});

test("known zero quote is explicit and one-way requests discard return fields", () => {
  const value = logisticsPayload("00000000-0000-4000-8000-000000000001", { ...valid, known_quote_lkr: "0", quote_note: "Driver reports no charge", manual_return_distance_km: "15", assume_equal_return: true });
  assert.equal(value.known_quote_lkr, "0");
  assert.equal(value.assume_equal_return, false);
  assert.equal(value.manual_return_distance_km, null);
  const roundTrip = logisticsPayload(value.produce_batch_id, { ...valid, pricing_basis: "round_trip", manual_return_distance_km: "15" });
  assert.equal(roundTrip.manual_return_distance_km, "15");
});

test("LKR formatting distinguishes zero and unavailable values and uses two decimals", () => {
  assert.equal(formatLKR(null), "Not calculated");
  assert.notEqual(formatLKR(0), "Not calculated");
  assert.match(formatLKR(0), /0\.00/);
  assert.match(formatLKR(1234.5), /1,234\.50/);
});

test("responses preserve missing route information rather than coercing it to zero", () => {
  const response = {
    estimate_id: null, status: "needs_input", produce_batch_id: "00000000-0000-4000-8000-000000000001", market_id: "dambulla-dec", market_name: "Dambulla", quantity_kg: "100", vehicle_capacity_kg: "500", trips: 1, trip_loads_kg: ["100"], route: { source: "unavailable", distance_km: null, duration_minutes: null, return_distance_km: null, return_duration_minutes: null, return_assumed_equal: false, cached: false, fallback_reason: "missing_origin", attribution: null }, breakdown: null, effective_cost_lkr: null, cost_source: "unavailable", currency: "LKR", assumptions: {}, messages: ["Use a manual distance or quote."],
  };
  const data = logisticsSchema.parse(response);
  assert.equal(data.route.distance_km, null);
  assert.equal(data.effective_cost_lkr, null);
  assert.equal(data.quantity_kg, 100);
});


test("an explicitly equal return distance can still use a separately entered return duration", () => {
  assert.equal(logisticsFormSchema.safeParse({ ...valid, pricing_basis: "round_trip", assume_equal_return: true, manual_return_duration_minutes: "45" }).success, true);
});
