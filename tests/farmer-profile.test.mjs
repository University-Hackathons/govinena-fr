import test from "node:test";
import assert from "node:assert/strict";
import { farmerFormSchema, toProfilePayload, formDefaults, farmerProfileSchema } from "../src/features/farmer-profile/schema.ts";

const valid = {
  ...formDefaults(null), full_name: "Test Farmer", district: "Kandy", town: "Gampola",
};

test("required-only setup skips optional fields and produces a typed payload", () => {
  const payload = toProfilePayload(farmerFormSchema.parse(valid));
  assert.equal(payload.full_name, "Test Farmer");
  assert.equal(payload.contact_number, null);
  assert.equal(payload.latitude, null);
  assert.equal(payload.longitude, null);
  assert.equal(payload.vehicle_capacity_kg, null);
  assert.equal(payload.estimated_transport_rate, null);
  assert.deepEqual(payload.preferred_market_ids, []);
});

test("reject invalid names, districts, contact, rates, capacities, and coordinates", () => {
  for (const invalid of [
    { full_name: " " }, { full_name: "bad\nname" }, { district: "Unknown" }, { town: "" },
    { contact_number: "123" }, { contact_number: "letters123456789" },
    { vehicle_capacity_kg: "-1" }, { vehicle_capacity_kg: "0" },
    { vehicle_capacity_kg: "0.001" }, { vehicle_capacity_kg: "1000001" },
    { estimated_transport_rate: "-1" }, { estimated_transport_rate: "Infinity" },
    { estimated_transport_rate: "1.234" }, { estimated_transport_rate: "NaN" },
    { latitude: "7" }, { longitude: "80" }, { latitude: "91", longitude: "80" },
    { latitude: "7", longitude: "181" }, { preferred_market_ids: "invalid/id" },
    { preferred_language: "xx" }, { transport_mode: "bus" },
  ]) assert.equal(farmerFormSchema.safeParse({ ...valid, ...invalid }).success, false, JSON.stringify(invalid));
});

test("normalize contact and market IDs and round approximate coordinates", () => {
  const payload = toProfilePayload(farmerFormSchema.parse({
    ...valid, contact_number: "+94 (77) 123-4567", latitude: "7.167891", longitude: "80.576789",
    estimated_transport_rate: "0", vehicle_capacity_kg: "200.50", preferred_market_ids: "market_1, market_2, market_1",
  }));
  assert.equal(payload.contact_number, "+94771234567");
  assert.equal(payload.latitude, 7.168);
  assert.equal(payload.longitude, 80.577);
  assert.equal(payload.estimated_transport_rate, 0);
  assert.equal(payload.vehicle_capacity_kg, 200.5);
  assert.deepEqual(payload.preferred_market_ids, ["market_1", "market_2"]);
});

test("load persisted Decimal strings into editable form fields", () => {
  const profile = farmerProfileSchema.parse({
    ...toProfilePayload(farmerFormSchema.parse(valid)),
    user_id: "00000000-0000-4000-8000-000000000001", vehicle_capacity_kg: "200.50",
    estimated_transport_rate: "80.00", created_at: "2026-11-13T00:00:00Z", updated_at: "2026-11-13T00:00:00Z",
    completion: { required_complete: true, optional_completed: 2, optional_total: 5, percentage: 70 },
  });
  const defaults = formDefaults(profile);
  assert.equal(defaults.vehicle_capacity_kg, "200.5");
  assert.equal(defaults.estimated_transport_rate, "80");
  assert.equal(defaults.district, "Kandy");
  assert.equal(farmerFormSchema.safeParse(defaults).success, true);
});
