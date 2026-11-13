import test from "node:test";
import assert from "node:assert/strict";
import { catalogID, catalogQuery, cropPageSchema, marketSchema, marketPageSchema } from "../src/features/catalog/schema.ts";

const source = { title: "Test reference", url: "https://example.org/source", accessed_on: "2026-11-13", note: "Test fixture only" };
const market = { id: "test-market", name: "Test market", district: "Matale", location: "Test location", active: true,
  market_type: "dedicated_economic_centre", latitude: null, longitude: null,
  coordinate_source: null, coordinates_verified_on: null, sources: [source] };

test("catalog queries encode Unicode, omit empty filters and default pagination", () => {
  const query = new URLSearchParams(catalogQuery({ q: " තක්කාලි ", district: "Nuwara Eliya", category: "" }));
  assert.equal(query.get("q"), "තක්කාලි");
  assert.equal(query.get("district"), "Nuwara Eliya");
  assert.equal(query.has("category"), false);
  assert.equal(query.get("page"), "1");
  assert.equal(query.get("page_size"), "12");
  assert.equal(new URLSearchParams(catalogQuery({ page: 2, page_size: 20 })).get("page"), "2");
});

test("catalog identifiers cannot contain path or query injection", () => {
  for (const id of ["../me", "tomato?active=false", "a/b", "", "a".repeat(65)]) assert.equal(catalogID.safeParse(id).success, false);
  assert.equal(catalogID.safeParse("dambulla-dec").success, true);
});

test("market data requires provenance and verified coordinate pairs", () => {
  assert.equal(marketSchema.safeParse(market).success, true);
  for (const invalid of [{ latitude: 7 }, { latitude: 91, longitude: 80 }, { sources: [] }, { coordinate_source: "javascript:alert(1)" }, { latitude: 7, longitude: 80 }]) {
    assert.equal(marketSchema.safeParse({ ...market, ...invalid }).success, false);
  }
  assert.equal(marketSchema.safeParse({ ...market, latitude: 7, longitude: 80, coordinate_source: source.url, coordinates_verified_on: source.accessed_on }).success, true);
});

test("empty catalog pages are valid but malformed service responses fail validation", () => {
  assert.equal(cropPageSchema.safeParse({ items: [], total: 0, page: 1, page_size: 12 }).success, true);
  assert.equal(marketPageSchema.safeParse({ items: [market], total: 1, page: 1, page_size: 12 }).success, true);
  assert.equal(marketPageSchema.safeParse({ markets: [market] }).success, false);
  assert.equal(cropPageSchema.safeParse({ items: [], total: -1, page: 0, page_size: 101 }).success, false);
});
