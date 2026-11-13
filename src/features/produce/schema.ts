import { z } from "zod";
import type { FarmerProfile } from "../farmer-profile/schema";

export const statuses = ["available", "reserved", "sold", "expired", "archived"] as const;
export const statusLabels: Record<(typeof statuses)[number], string> = {
  available: "Available", reserved: "Reserved", sold: "Sold", expired: "Expired", archived: "Archived",
};
const id = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);
export const sourceLocationSchema = z.object({
  district: z.string().min(1), town: z.string().min(2).max(120),
  latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(),
}).refine((value) => (value.latitude === null) === (value.longitude === null));
const timestamp = z.iso.datetime({ offset: true });
export const produceSchema = z.object({
  id: z.uuid(), farmer_id: z.uuid(), crop_id: id,
  crop: z.object({ id, name_en: z.string(), name_si: z.string(), name_ta: z.string(), active: z.boolean() }),
  quantity_kg: z.union([z.string(), z.number()]).transform(Number).pipe(z.number().finite().positive().max(1000000)),
  quality: z.string().max(80).nullable(), notes: z.string().max(2000).nullable(),
  harvested_at: timestamp, sell_by: timestamp, source_location: sourceLocationSchema,
  status: z.enum(statuses), archived_at: timestamp.nullable(), created_at: timestamp, updated_at: timestamp,
}).refine((batch) => batch.crop_id === batch.crop.id && Date.parse(batch.sell_by) > Date.parse(batch.harvested_at)
  && (batch.status === "archived") === (batch.archived_at !== null));
export const producePageSchema = z.object({
  items: z.array(produceSchema), total: z.number().int().min(0), page: z.number().int().min(1), page_size: z.number().int().min(1).max(100),
});
export type ProduceBatch = z.infer<typeof produceSchema>;

/** datetime-local inputs are explicitly Sri Lankan wall time, independent of device timezone. */
export function sriLankaInputToISO(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid date and time.");
  const [, y, m, d, h, min] = match.map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, h, min));
  if (y < 1000 || probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d || h > 23 || min > 59)
    throw new Error("Enter a valid date and time.");
  return new Date(probe.getTime() - 330 * 60000).toISOString();
}
export function toSriLankaInput(value: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const part = (name: string) => parts.find((item) => item.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
export function formatBatchDate(value: string): string {
  return new Intl.DateTimeFormat("en-LK", { timeZone: "Asia/Colombo", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
const localTimestamp = z.string().refine((value) => { try { sriLankaInputToISO(value); return true; } catch { return false; } }, "Enter a valid date and time.");
const readable = z.string().trim().min(2, "Enter at least 2 characters.").max(120).refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Remove control characters.");
const optionalCoordinate = (min: number, max: number) => z.string().refine((value) => !value || Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max, "Choose a valid location or remove the pin.");
export const produceFormSchema = z.object({
  crop_id: id.min(1, "Select a crop."),
  quantity_kg: z.string().trim().refine((value) => /^\d+(?:\.\d{1,3})?$/.test(value) && Number(value) > 0 && Number(value) <= 1000000, "Enter a quantity above 0 and up to 1,000,000 kg, with at most 3 decimal places."),
  quality: z.string().trim().max(80), notes: z.string().trim().max(2000).refine((value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), "Remove control characters."),
  harvested_at: localTimestamp, sell_by: localTimestamp,
  district: z.string().min(1, "Select a district."), town: readable,
  latitude: optionalCoordinate(-90, 90), longitude: optionalCoordinate(-180, 180),
  status: z.enum(statuses),
}).superRefine((value, ctx) => {
  if (!!value.latitude !== !!value.longitude) ctx.addIssue({ code: "custom", path: ["longitude"], message: "Choose a location or remove the pin." });
  let harvest: number, deadline: number;
  try { harvest = Date.parse(sriLankaInputToISO(value.harvested_at)); deadline = Date.parse(sriLankaInputToISO(value.sell_by)); } catch { return; }
  const now = Date.now();
  if (harvest > now + 300000) ctx.addIssue({ code: "custom", path: ["harvested_at"], message: "Harvest cannot be in the future." });
  if (deadline <= harvest) ctx.addIssue({ code: "custom", path: ["sell_by"], message: "Sale deadline must be after harvest." });
  if (["available", "reserved"].includes(value.status) && deadline <= now) ctx.addIssue({ code: "custom", path: ["sell_by"], message: "Choose a future deadline for an available or reserved batch." });
  if (value.status === "expired" && deadline > now) ctx.addIssue({ code: "custom", path: ["sell_by"], message: "Expired batches must have reached their deadline." });
});
export type ProduceFormValues = z.infer<typeof produceFormSchema>;
export function produceDefaults(batch: ProduceBatch | null, profile: FarmerProfile): ProduceFormValues {
  const location = batch?.source_location ?? profile;
  return {
    crop_id: batch?.crop_id ?? "", quantity_kg: batch?.quantity_kg.toString() ?? "", quality: batch?.quality ?? "", notes: batch?.notes ?? "",
    harvested_at: batch ? toSriLankaInput(batch.harvested_at) : "", sell_by: batch ? toSriLankaInput(batch.sell_by) : "",
    district: location.district, town: location.town, latitude: location.latitude?.toString() ?? "", longitude: location.longitude?.toString() ?? "", status: batch?.status ?? "available",
  };
}
export function producePayload(values: ProduceFormValues) {
  return { crop_id: values.crop_id, quantity_kg: values.quantity_kg, quality: values.quality || null, notes: values.notes || null,
    harvested_at: sriLankaInputToISO(values.harvested_at), sell_by: sriLankaInputToISO(values.sell_by), status: values.status,
    source_location: { district: values.district, town: values.town, latitude: values.latitude ? Number(values.latitude) : null, longitude: values.longitude ? Number(values.longitude) : null },
  };
}

/** PATCH only changed values, preserving existing timestamp precision and location snapshots. */
export function producePatchPayload(values: ProduceFormValues, original: ProduceFormValues) {
  const before = producePayload(original);
  return Object.fromEntries(Object.entries(producePayload(values)).filter(([key, value]) =>
    JSON.stringify(value) !== JSON.stringify(before[key as keyof typeof before])));
}
