import test from "node:test";
import assert from "node:assert/strict";
import { produceFormSchema, produceDefaults, producePayload, producePatchPayload, produceSchema, producePageSchema, sriLankaInputToISO, toSriLankaInput, formatBatchDate } from "../src/features/produce/schema.ts";

const profile = { district: "Kandy", town: "Gampola", latitude: 7.164, longitude: 80.569 };
const now = Date.now();
const valid = { ...produceDefaults(null, profile), crop_id: "tomato", quantity_kg: "125.125", harvested_at: toSriLankaInput(new Date(now - 7200000).toISOString()), sell_by: toSriLankaInput(new Date(now + 86400000).toISOString()) };

test("Sri Lankan time conversion is timezone-independent and rejects impossible dates", () => {
  assert.equal(sriLankaInputToISO("2026-11-13T14:30"), "2026-11-13T09:00:00.000Z");
  assert.equal(toSriLankaInput("2026-11-13T09:00:00Z"), "2026-11-13T14:30");
  assert.equal(sriLankaInputToISO("2024-02-29T00:00"), "2024-02-28T18:30:00.000Z");
  assert.ok(formatBatchDate("2026-11-13T09:00:00Z"));
  for (const bad of ["2026-02-29T00:00", "2026-11-31T14:30", "2026-13-01T14:30", "2026-11-13T25:00", "2026-11-13T14:61", "", "2026-11-13"])
    assert.throws(() => sriLankaInputToISO(bad));
});

test("new batch defaults to a snapshot of farmer location and produces typed payload", () => {
  const values = produceFormSchema.parse(valid);
  const payload = producePayload(values);
  assert.equal(payload.quantity_kg, "125.125");
  assert.equal(payload.status, "available");
  assert.equal(payload.quality, null);
  assert.equal(payload.notes, null);
  assert.deepEqual(payload.source_location, profile);
  assert.ok(payload.harvested_at.endsWith("Z"));
});

test("form rejects invalid quantity, crop, source and chronology", () => {
  for (const bad of [
    { quantity_kg: "0" }, { quantity_kg: "-1" }, { quantity_kg: "NaN" }, { quantity_kg: "Infinity" }, { quantity_kg: "1000001" }, { quantity_kg: "1.0001" }, { quantity_kg: "1e3" },
    { crop_id: "" }, { crop_id: "bad/id" }, { town: "" }, { town: "Bad\ntown" },
    { latitude: "91" }, { longitude: "" }, { notes: "bad\u0000text" },
    { harvested_at: toSriLankaInput(new Date(now + 86400000).toISOString()) },
    { sell_by: valid.harvested_at }, { sell_by: "2026-02-30T00:00" },
    { status: "expired" }, { status: "unknown" },
  ]) assert.equal(produceFormSchema.safeParse({ ...valid, ...bad }).success, false, JSON.stringify(bad));
  assert.equal(produceFormSchema.safeParse({ ...valid, latitude: "", longitude: "" }).success, true);
});

test("historical expired and sold records are editable without extending deadlines", () => {
  const historical = { ...valid, harvested_at: toSriLankaInput(new Date(now - 172800000).toISOString()), sell_by: toSriLankaInput(new Date(now - 86400000).toISOString()) };
  assert.equal(produceFormSchema.safeParse({ ...historical, status: "expired" }).success, true);
  assert.equal(produceFormSchema.safeParse({ ...historical, status: "sold" }).success, true);
  assert.equal(produceFormSchema.safeParse(historical).success, false);
});

test("persisted responses restore edit values and validate archive consistency", () => {
  const payload = producePayload(produceFormSchema.parse(valid));
  const response = { ...payload, id: "00000000-0000-4000-8000-000000000001", farmer_id: "00000000-0000-4000-8000-000000000002",
    crop: { id: "tomato", name_en: "Tomato", name_si: "තක්කාලි", name_ta: "தக்காளி", active: true },
    archived_at: null, created_at: "2026-11-13T09:00:00Z", updated_at: "2026-11-13T09:00:00Z" };
  const batch = produceSchema.parse(response);
  assert.equal(batch.quantity_kg, 125.125);
  const defaults = produceDefaults(batch, { ...profile, town: "Different profile town" });
  assert.equal(defaults.town, "Gampola");
  assert.equal(defaults.harvested_at, valid.harvested_at);
  assert.equal(produceSchema.safeParse({ ...response, crop_id: "carrot" }).success, false);
  assert.equal(produceSchema.safeParse({ ...response, status: "archived" }).success, false);
  assert.equal(produceSchema.safeParse({ ...response, status: "archived", archived_at: response.created_at }).success, true);
  assert.equal(producePageSchema.safeParse({ items: [], total: 0, page: 1, page_size: 12 }).success, true);
});


test("partial edits preserve timestamps, crop and location when only quantity changes", () => {
  assert.deepEqual(producePatchPayload({ ...valid, quantity_kg: "90.5" }, valid), { quantity_kg: "90.5" });
  assert.deepEqual(producePatchPayload(valid, valid), {});
  assert.deepEqual(producePatchPayload({ ...valid, notes: "Updated" }, valid), { notes: "Updated" });
});
