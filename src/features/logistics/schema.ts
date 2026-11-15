import { z } from "zod";
import type { FarmerProfile } from "../farmer-profile/schema";

const number = z.union([z.string(), z.number()]).transform(Number).pipe(z.number().finite().nonnegative());
const nullableNumber = number.nullable();
const moneyInput = z.string().trim().refine((value) => value === "" || /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) <= 1000000000, "Enter 0–1,000,000,000 LKR with at most 2 decimals.");
const optionalMeasure = (max: number, places: number) => z.string().trim().refine((value) => value === "" || new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(value) && Number(value) <= max, `Enter 0–${max} with at most ${places} decimals, or leave blank.`);
export const logisticsFormSchema = z.object({
  market_id: z.string().min(1, "Select a market."),
  route_mode: z.enum(["automatic", "manual"]), pricing_basis: z.enum(["one_way", "round_trip"]),
  transport_mode: z.enum(["own_vehicle", "hired_vehicle", "other"]),
  vehicle_capacity_kg: z.string().trim().refine((value) => /^\d+(?:\.\d{1,3})?$/.test(value) && Number(value) > 0 && Number(value) <= 1000000, "Enter a capacity above 0 and up to 1,000,000 kg."),
  allow_multiple_trips: z.boolean(), assume_equal_return: z.boolean(),
  base_charge_lkr: moneyInput, rate_per_km_lkr: moneyInput, loading_lkr: moneyInput,
  unloading_lkr: moneyInput, toll_lkr: moneyInput, market_handling_lkr: moneyInput,
  manual_distance_km: optionalMeasure(20000, 3), manual_return_distance_km: optionalMeasure(20000, 3),
  manual_duration_minutes: optionalMeasure(100000, 2), manual_return_duration_minutes: optionalMeasure(100000, 2),
  known_quote_lkr: moneyInput, quote_note: z.string().trim().max(300),
}).superRefine((value, ctx) => {
  if (value.known_quote_lkr !== "" && value.quote_note.length < 3) ctx.addIssue({ code: "custom", path: ["quote_note"], message: "Describe the quote for the entire batch and all deliveries." });
  if (value.manual_duration_minutes !== "" && value.manual_distance_km === "") ctx.addIssue({ code: "custom", path: ["manual_distance_km"], message: "Manual duration requires a distance." });
  if (value.manual_return_duration_minutes !== "" && value.manual_return_distance_km === "" && !(value.assume_equal_return && value.manual_distance_km !== "")) ctx.addIssue({ code: "custom", path: ["manual_return_distance_km"], message: "Return duration requires a return distance." });
  if (value.assume_equal_return && value.manual_return_distance_km !== "") ctx.addIssue({ code: "custom", path: ["manual_return_distance_km"], message: "Use an explicit return distance or the equal-distance assumption, not both." });
});
export type LogisticsForm = z.infer<typeof logisticsFormSchema>;
export function defaults(profile: FarmerProfile | null): LogisticsForm {
  return { market_id: "", route_mode: "automatic", pricing_basis: "one_way", transport_mode: profile?.transport_mode ?? "other", vehicle_capacity_kg: profile?.vehicle_capacity_kg?.toString() ?? "", allow_multiple_trips: false, assume_equal_return: false,
    base_charge_lkr: "0", rate_per_km_lkr: profile?.estimated_transport_rate?.toString() ?? "", loading_lkr: "0", unloading_lkr: "0", toll_lkr: "0", market_handling_lkr: "0",
    manual_distance_km: "", manual_return_distance_km: "", manual_duration_minutes: "", manual_return_duration_minutes: "", known_quote_lkr: "", quote_note: "" };
}
export function logisticsPayload(batchId: string, value: LogisticsForm) {
  const optional = (text: string) => text === "" ? null : text;
  return { produce_batch_id: batchId, market_id: value.market_id, route_mode: value.route_mode, pricing_basis: value.pricing_basis, transport_mode: value.transport_mode,
    vehicle_capacity_kg: value.vehicle_capacity_kg, allow_multiple_trips: value.allow_multiple_trips,
    tariff: { base_charge_lkr: value.base_charge_lkr || "0", rate_per_km_lkr: optional(value.rate_per_km_lkr), loading_lkr: value.loading_lkr || "0", unloading_lkr: value.unloading_lkr || "0", toll_lkr: value.toll_lkr || "0", market_handling_lkr: value.market_handling_lkr || "0" },
    manual_distance_km: optional(value.manual_distance_km), manual_duration_minutes: optional(value.manual_duration_minutes),
    manual_return_distance_km: value.pricing_basis === "round_trip" ? optional(value.manual_return_distance_km) : null,
    manual_return_duration_minutes: value.pricing_basis === "round_trip" ? optional(value.manual_return_duration_minutes) : null,
    assume_equal_return: value.pricing_basis === "round_trip" && value.assume_equal_return,
    known_quote_lkr: optional(value.known_quote_lkr), quote_note: value.quote_note || null,
  };
}
export const routeSchema = z.object({ source: z.enum(["mapbox", "manual", "unavailable"]), distance_km: nullableNumber, duration_minutes: nullableNumber, return_distance_km: nullableNumber, return_duration_minutes: nullableNumber, return_assumed_equal: z.boolean(), cached: z.boolean(), fallback_reason: z.string().nullable(), attribution: z.string().nullable() });
export const breakdownSchema = z.object({ base_charge_lkr: number, distance_charge_lkr: number, loading_lkr: number, unloading_lkr: number, toll_lkr: number, market_handling_lkr: number, billable_distance_km: number, calculated_total_lkr: number });
export const logisticsSchema = z.object({ estimate_id: z.uuid().nullable(), status: z.enum(["complete", "needs_input"]), produce_batch_id: z.uuid(), market_id: z.string(), market_name: z.string(), quantity_kg: number, vehicle_capacity_kg: number, trips: z.number().int().min(1).max(100), trip_loads_kg: z.array(number), route: routeSchema, breakdown: breakdownSchema.nullable(), effective_cost_lkr: nullableNumber, cost_source: z.enum(["calculated", "user_quote", "unavailable"]), currency: z.literal("LKR"), assumptions: z.record(z.string(), z.unknown()), messages: z.array(z.string()) });
export type LogisticsResult = z.infer<typeof logisticsSchema>;
export const estimateHistorySchema = z.object({ items: z.array(z.object({ id: z.uuid(), produce_batch_id: z.uuid(), market_id: z.string(), market_name: z.string(), created_at: z.iso.datetime({ offset: true }), assumptions: z.record(z.string(), z.unknown()), recorded_result: z.record(z.string(), z.unknown()).nullable() })) });
export function formatLKR(amount: number | null) {
  return amount === null ? "Not calculated" : new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}
