import { z } from "zod";

export const storageOptions = [
  { value: "unknown", label: "Unknown / not recorded" },
  { value: "ambient", label: "Ambient conditions" },
  { value: "shaded", label: "Shaded storage" },
  { value: "cooled", label: "Cooled storage" },
] as const;
export type StorageCondition = typeof storageOptions[number]["value"];
const timestamp = z.iso.datetime({ offset: true });
// Reject null rather than converting missing values to zero.
const amount = z.union([z.number(), z.string().min(1)]).transform(Number).pipe(z.number().finite().nonnegative());
export const riskSchema = z.object({
  produce_batch_id: z.uuid(), crop_id: z.string(), assessed_at: timestamp,
  expected_arrival_at: timestamp.nullable(), evaluated_at: timestamp, harvested_at: timestamp,
  user_deadline: timestamp, remaining_selling_seconds: amount,
  remaining_at_arrival_seconds: amount.nullable(), deadline_status: z.enum(["open", "reached", "passed"]),
  deadline_eligible: z.boolean(), alternative_accepted: z.boolean(),
  rejection_reason: z.enum(["deadline_reached", "arrival_at_or_after_deadline", "batch_closed"]).nullable(),
  urgency: z.enum(["low", "medium", "high"]), profile_version: z.number().int().positive().nullable(),
  guidance_status: z.enum(["configured", "missing", "disabled"]), guidance_window_hours: z.number().positive().nullable(),
  storage_condition: z.enum(["unknown", "ambient", "shaded", "cooled"]), quantity_kg: amount,
  estimated_saleable_quantity_kg: amount.nullable(), assumed_loss_percent: amount.nullable(),
  assumptions: z.array(z.string()), formula_version: z.literal("crop_risk_v1"),
});
export type RiskResult = z.infer<typeof riskSchema>;
export function remainingTime(seconds: number): string {
  if (seconds <= 0) return "No selling time remaining";
  if (seconds < 3600) return "Less than 1 hour remaining";
  const hours = Math.floor(seconds / 3600);
  return hours < 24 ? `About ${hours} hour${hours === 1 ? "" : "s"} remaining` : `About ${Math.floor(hours / 24)} day${hours < 48 ? "" : "s"} ${hours % 24} hours remaining`;
}
export function approximateQuantity(value: number | null): string {
  if (value === null) return "Unknown — no applicable loss estimate";
  if (value === 0) return "Approximately 0 kg";
  if (value < 1) return "Less than 1 kg (assumed)";
  return `Approximately ${Math.round(value).toLocaleString("en-LK")} kg`;
}
