import { z } from "zod";
const numeric = z.union([z.number(), z.string().min(1)]).transform(Number).pipe(z.number().finite());
const positive = numeric.pipe(z.number().nonnegative());
const monetary = z.union([z.string().regex(/^-?\d+(?:\.\d+)?$/), z.number().finite()]).transform(String);
const nonnegativeMoney = monetary.refine((value) => !value.startsWith("-"), "Money cannot be negative");
const time = z.iso.datetime({ offset: true });
const price = z.object({ observation_id: z.uuid(), price_per_kg: nonnegativeMoney.nullable(), unit: z.literal("kg"), currency: z.literal("LKR"), price_type: z.enum(["wholesale", "retail", "farmgate"]), quality: z.string(), observed_at: time, observation_precision: z.string(), source_name: z.string(), source_url: z.string().nullable(), document_reference: z.string().nullable(), source_publication_date: z.string(), source_published_at: time.nullable(), imported_at: time, age_hours: numeric, age_at_arrival_hours: numeric.nullable(), freshness: z.enum(["fresh", "stale", "missing", "future"]) });
const transport = z.object({ cost_source: z.enum(["calculated", "user_quote", "unavailable"]), trips: z.number().int().positive(), route: z.object({ source: z.enum(["manual", "mapbox", "unavailable"]), distance_km: positive.nullable(), duration_minutes: positive.nullable(), return_distance_km: positive.nullable(), attribution: z.string().nullable() }), breakdown: z.object({ base_charge_lkr: nonnegativeMoney, distance_charge_lkr: nonnegativeMoney, loading_lkr: nonnegativeMoney, unloading_lkr: nonnegativeMoney, toll_lkr: nonnegativeMoney, market_handling_lkr: nonnegativeMoney, calculated_total_lkr: nonnegativeMoney, billable_distance_km: positive }).nullable(), messages: z.array(z.string()) });
const risk = z.object({ urgency: z.enum(["low", "medium", "high"]), profile_version: z.number().int().positive().nullable(), assumptions: z.array(z.string()) });
export const comparisonSchema = z.object({ snapshot_id: z.uuid().nullable(), produce_batch_id: z.uuid(), assessed_at: time, price_type: z.enum(["wholesale", "retail", "farmgate"]), quality: z.string(), price_max_age_hours: z.number().positive(), currency: z.literal("LKR"), formula_version: z.literal("market_comparison_v1"), snapshot_note: z.string(), assumptions: z.array(z.string()), eligible: z.array(z.object({ rank: z.number().int().positive(), market_id: z.string(), market_name: z.string(), arrival_at: time, arrival_source: z.enum(["user_input", "route_duration"]), price, transport, risk, quantity_basis: z.enum(["crop_rule", "explicit_no_loss"]), expected_saleable_quantity_kg: positive, expected_gross_revenue_lkr: nonnegativeMoney, transport_cost_lkr: nonnegativeMoney, additional_market_cost_lkr: nonnegativeMoney, total_cost_lkr: nonnegativeMoney, expected_net_proceeds_lkr: monetary, assumptions: z.array(z.string()) })), excluded: z.array(z.object({ market_id: z.string(), market_name: z.string(), code: z.string(), reason: z.string(), price: price.nullable(), transport: transport.nullable(), risk: risk.nullable() })) });
export type ComparisonResult = z.infer<typeof comparisonSchema>;
export const additionalFeeSchema = z.string().trim().refine((value) => value === "" || /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) <= 1000000000, "Additional fees must be 0–1,000,000,000 LKR with at most two decimals.");
export function uniqueCandidates(ids: string[]) { return ids.length > 0 && ids.length <= 20 && ids.every(Boolean) && new Set(ids).size === ids.length; }

// Keep backend Decimal amounts as strings; Number would lose cents on large totals.
export function formatComparisonLKR(value: string | number | null): string {
  if (value === null) return "Not calculated";
  const text = String(value), negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace(/^-/, "").split(".");
  let cents = BigInt(whole) * BigInt(100) + BigInt((fraction + "00").slice(0, 2));
  if (Number(fraction[2] ?? "0") >= 5) cents += BigInt(1);
  return `LKR ${negative && cents !== BigInt(0) ? "-" : ""}${new Intl.NumberFormat("en-LK").format(cents / BigInt(100))}.${String(cents % BigInt(100)).padStart(2, "0")}`;
}
