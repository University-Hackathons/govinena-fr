import { z } from "zod";

export const priceTypes = ["wholesale", "retail", "farmgate"] as const;
export const priceTypeLabels = { wholesale: "Wholesale", retail: "Retail", farmgate: "Farmgate" };
const dateTime = z.iso.datetime({ offset: true });
const safeURL = z.url().refine((value) => /^https?:\/\//.test(value));
const money = z.union([z.number(), z.string()]).transform(Number).pipe(z.number().finite().min(0)).nullable();
export const observationSchema = z.object({
  series_key: z.string().length(64), id: z.uuid(), crop_id: z.string(), crop_name: z.string(), market_id: z.string(), market_name: z.string(),
  observed_at: dateTime, observation_precision: z.enum(["day", "timestamp"]), price_per_kg: money,
  currency: z.literal("LKR"), unit: z.literal("kg"), price_type: z.enum(priceTypes), quality: z.string(),
  source_name: z.string(), source_url: safeURL.nullable(), document_reference: z.string().nullable(),
  source_publication_date: z.iso.date(), source_published_at: dateTime.nullable(), imported_at: dateTime, import_id: z.uuid(),
  freshness: z.enum(["fresh", "stale", "missing"]), age_hours: z.number().finite().min(0),
}).refine((item) => (item.price_per_kg === null) === (item.freshness === "missing"));
export type Observation = z.infer<typeof observationSchema>;
const metadata = { total: z.number().int().min(0), page: z.number().int().min(1), page_size: z.number().int().min(1).max(100) };
export const latestSchema = z.object({ items: z.array(observationSchema), ...metadata, as_of: dateTime, stale_after_hours: z.number().positive() });
export const historySchema = z.object({ items: z.array(observationSchema), total: z.number().int().min(0), truncated: z.boolean(), start_date: z.iso.date(), end_date: z.iso.date() });
export type History = z.infer<typeof historySchema>;
export const comparisonSchema = z.object({ items: z.array(z.object({ market_id: z.string(), market_name: z.string(), district: z.string(), observations: z.array(observationSchema) })), ...metadata, as_of: dateTime });
export const freshnessSchema = z.object({ as_of: dateTime, stale_after_hours: z.number().positive(), fresh_series: z.number().int().min(0), stale_series: z.number().int().min(0), missing_series: z.number().int().min(0), expected_market_crop_pairs: z.number().int().min(0), pairs_without_reported_price: z.number().int().min(0), last_observed_at: dateTime.nullable(), last_imported_at: dateTime.nullable() });
export const accessSchema = z.object({ can_import: z.boolean() });
export const importReportSchema = z.object({ id: z.uuid(), sha256: z.string().length(64), filename: z.string(), provider: z.string(), imported_by: z.uuid(), imported_at: dateTime, verification_note: z.string(), accepted: z.number().int().min(0), duplicates: z.number().int().min(0), rejected: z.number().int().min(0), replayed: z.boolean() });
export type ImportReport = z.infer<typeof importReportSchema>;
export const auditSchema = z.object({ report: importReportSchema, items: z.array(z.object({ row_number: z.number().int().min(0), outcome: z.enum(["accepted", "duplicate", "rejected"]), error_code: z.string().nullable(), observation_id: z.uuid().nullable(), raw_data: z.record(z.string(), z.unknown()) })), ...metadata });
export type PriceFilters = { crop_id?: string; market_id?: string; price_type: (typeof priceTypes)[number]; quality?: string; source_name?: string };
export function priceQuery(filters: PriceFilters, extra: Record<string, string | number> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...extra })) if (value !== undefined && value !== "") query.set(key, String(value));
  return query.toString();
}
export function observationDate(row: Pick<Observation, "observed_at" | "observation_precision">) {
  return new Intl.DateTimeFormat("en-LK", { timeZone: "Asia/Colombo", dateStyle: "medium", ...(row.observation_precision === "timestamp" ? { timeStyle: "short" as const } : {}) }).format(new Date(row.observed_at)) + (row.observation_precision === "day" ? " (day only)" : "");
}
export function formatPrice(value: number | null) {
  return value === null ? "Not reported" : new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 6 }).format(value);
}

/** No interpolation or zero-fill: add null sentinels for absent Sri Lankan calendar days. */
export function historyChartData(history: History) {
  const series = new Map<string, { key: string; label: string }>();
  const days = new Map<string, Set<string>>();
  const points = new Map<number, Record<string, number | null>>();
  const dayKey = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
  const allSeries = new Set(history.items.map((row) => row.series_key));
  for (const row of history.items) {
    if (!series.has(row.series_key)) {
      if (series.size >= 12) continue;
      series.set(row.series_key, { key: `price${series.size}`, label: `${row.source_name} · ${row.quality || "Grade unspecified"}` });
      days.set(row.series_key, new Set());
    }
    days.get(row.series_key)!.add(dayKey(row.observed_at));
    const time = Date.parse(row.observed_at), field = series.get(row.series_key)!.key;
    points.set(time, { ...points.get(time), time, [field]: row.price_per_kg });
  }
  const start = Date.parse(`${history.start_date}T00:00:00+05:30`), end = Date.parse(`${history.end_date}T00:00:00+05:30`);
  // Defensive bounds match the API's maximum date window.
  if (end - start > 366 * 86400000 || end < start) throw new Error("Invalid chart date range");
  for (let time = start; time <= end; time += 86400000) {
    const date = dayKey(new Date(time).toISOString());
    for (const [identity, field] of series) {
      if (!days.get(identity)!.has(date)) points.set(time, { ...points.get(time), time, [field.key]: null });
    }
  }
  return { series: [...series.values()], totalSeries: allSeries.size, points: [...points.values()].sort((a, b) => Number(a.time) - Number(b.time)) };
}
