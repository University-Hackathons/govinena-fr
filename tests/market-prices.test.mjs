import test from "node:test";
import assert from "node:assert/strict";
import { observationSchema, latestSchema, formatPrice, historyChartData, observationDate, priceQuery } from "../src/features/market-prices/schema.ts";

const row = {
  series_key: "a".repeat(64), id: "00000000-0000-4000-8000-000000000001", crop_id: "tomato", crop_name: "Tomato", market_id: "dambulla-dec", market_name: "Dambulla", price_per_kg: "345.000000", price_type: "wholesale", currency: "LKR", unit: "kg", quality: "", source_name: "Central Bank of Sri Lanka", source_url: "https://www.cbsl.gov.lk/report.pdf", document_reference: "Test source reference", source_publication_date: "2025-12-30", source_published_at: null, observed_at: "2025-12-29T18:30:00Z", observation_precision: "day", imported_at: "2026-11-15T10:00:00Z", import_id: "00000000-0000-4000-8000-000000000002", freshness: "stale", age_hours: 100,
};

test("prices preserve zero, missing and decimal values without treating them as live", () => {
  assert.equal(observationSchema.parse(row).price_per_kg, 345);
  assert.equal(observationSchema.parse({ ...row, price_per_kg: "0" }).price_per_kg, 0);
  assert.equal(observationSchema.parse({ ...row, price_per_kg: null, freshness: "missing" }).price_per_kg, null);
  assert.equal(observationSchema.safeParse({ ...row, price_per_kg: "-1" }).success, false);
  assert.equal(observationSchema.safeParse({ ...row, price_per_kg: "Infinity" }).success, false);
  assert.equal(observationSchema.safeParse({ ...row, price_per_kg: null }).success, false);
  assert.notEqual(formatPrice(0), formatPrice(null));
  assert.match(observationDate(row), /day only/);
  assert.equal(latestSchema.safeParse({ items: [], total: 0, page: 1, page_size: 20, as_of: row.imported_at, stale_after_hours: 72 }).success, true);
});

test("queries keep price types separate and correctly encode filters", () => {
  const query = new URLSearchParams(priceQuery({ crop_id: "tomato", price_type: "retail", source_name: "Source & Co", market_id: undefined }, { page: 2 }));
  assert.equal(query.get("price_type"), "retail");
  assert.equal(query.get("source_name"), "Source & Co");
  assert.equal(query.get("page"), "2");
  assert.equal(query.has("market_id"), false);
});

test("history charts break gaps, preserve zero, and separate source/quality streams", () => {
  const first = observationSchema.parse({ ...row, observed_at: "2025-12-28T18:30:00Z", price_per_kg: 0 });
  const last = observationSchema.parse({ ...row, observed_at: "2025-12-30T18:30:00Z", price_per_kg: 50 });
  const other = observationSchema.parse({ ...last, series_key: "b".repeat(64), source_name: "Other source", quality: "A", price_per_kg: 75 });
  const chart = historyChartData({ items: [first, last, other], total: 3, truncated: false, start_date: "2025-12-29", end_date: "2025-12-31" });
  assert.equal(chart.series.length, 2);
  assert.equal(chart.points.find((point) => point.time === Date.parse(first.observed_at)).price0, 0);
  assert.equal(chart.points.find((point) => point.time === Date.parse("2025-12-29T18:30:00Z")).price0, null);
  assert.equal(chart.points.find((point) => point.time === Date.parse(last.observed_at)).price1, 75);
});

test("chart truncation is explicit and date ranges are bounded", () => {
  const items = Array.from({ length: 14 }, (_, index) => observationSchema.parse({ ...row, series_key: index.toString().padStart(64, "0"), source_name: `Source ${index}` }));
  const chart = historyChartData({ items, total: 14, truncated: false, start_date: "2025-12-30", end_date: "2025-12-30" });
  assert.equal(chart.totalSeries, 14);
  assert.equal(chart.series.length, 12);
  assert.throws(() => historyChartData({ items: [], total: 0, truncated: false, start_date: "2020-01-01", end_date: "2025-12-30" }));
});
