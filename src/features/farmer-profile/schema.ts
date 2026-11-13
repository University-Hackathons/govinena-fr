import { z } from "zod";

export const districts = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala",
  "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa",
  "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya",
] as const;
const readable = z.string().trim().min(2, "Enter at least 2 characters.").max(120)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Remove control characters.");
const phone = z.string().trim().max(40).transform((value) => value.replace(/[\s()\-]/g, ""))
  .refine((value) => !value || /^(?:0[1-9][0-9]{8}|\+[1-9][0-9]{7,14})$/.test(value), "Use a local number such as 0771234567, or +country code and number.");
const optionalNumber = (min: number, max: number, strictlyPositive = false, money = false) =>
  z.string().trim().refine((value) => {
    if (!value) return true;
    if (!/^-?\d+(?:\.\d+)?$/.test(value)) return false;
    const number = Number(value);
    return Number.isFinite(number) && (strictlyPositive ? number > min : number >= min)
      && number <= max && (!money || /^-?\d+(?:\.\d{1,2})?$/.test(value));
  }, `Enter ${strictlyPositive ? "a positive value" : `a value from ${min}`} up to ${max}${money ? " with at most 2 decimal places" : ""}, or leave empty.`);
const market = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
const parseMarkets = (value: string) => [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];

export const farmerFormSchema = z.object({
  full_name: readable,
  contact_number: phone,
  district: z.enum(districts, { error: "Select your district." }),
  town: readable,
  preferred_language: z.enum(["en", "si", "ta"]),
  latitude: optionalNumber(-90, 90),
  longitude: optionalNumber(-180, 180),
  transport_mode: z.enum(["own_vehicle", "hired_vehicle", "other"]),
  vehicle_capacity_kg: optionalNumber(0, 1000000, true, true),
  estimated_transport_rate: optionalNumber(0, 1000000, false, true),
  preferred_market_ids: z.string().max(1400).refine((value) => {
    const ids = parseMarkets(value);
    return ids.length <= 20 && ids.every((id) => market.safeParse(id).success);
  }, "Enter up to 20 comma-separated market IDs (letters, numbers, underscores or hyphens)."),
}).superRefine((value, ctx) => {
  if (Boolean(value.latitude.trim()) !== Boolean(value.longitude.trim())) {
    ctx.addIssue({ code: "custom", path: ["longitude"], message: "Provide both coordinates or leave both empty." });
  }
});
export type FarmerFormValues = z.input<typeof farmerFormSchema>;
export type FarmerFormOutput = z.output<typeof farmerFormSchema>;

const coordinate = (value: string) => value.trim() ? Math.round(Number(value) * 1000) / 1000 : null;
export function toProfilePayload(value: FarmerFormOutput) {
  return {
    ...value,
    contact_number: value.contact_number || null,
    latitude: coordinate(value.latitude), longitude: coordinate(value.longitude),
    vehicle_capacity_kg: value.vehicle_capacity_kg.trim() ? Number(value.vehicle_capacity_kg) : null,
    estimated_transport_rate: value.estimated_transport_rate.trim() ? Number(value.estimated_transport_rate) : null,
    preferred_market_ids: parseMarkets(value.preferred_market_ids),
  };
}

const decimal = z.union([z.number(), z.string()]).transform(Number).pipe(z.number().finite().min(0).max(1000000));
export const farmerProfileSchema = z.object({
  user_id: z.uuid(), full_name: readable, contact_number: z.string().nullable(),
  district: z.enum(districts), town: readable, preferred_language: z.enum(["en", "si", "ta"]),
  latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(),
  transport_mode: z.enum(["own_vehicle", "hired_vehicle", "other"]),
  vehicle_capacity_kg: decimal.nullable(), estimated_transport_rate: decimal.nullable(),
  preferred_market_ids: z.array(market), created_at: z.string(), updated_at: z.string(),
  completion: z.object({ required_complete: z.boolean(), optional_completed: z.number().int(), optional_total: z.number().int(), percentage: z.number().min(0).max(100) }),
});
export type FarmerProfile = z.infer<typeof farmerProfileSchema>;
export function formDefaults(profile: FarmerProfile | null): FarmerFormValues {
  return {
    full_name: profile?.full_name ?? "", contact_number: profile?.contact_number ?? "",
    district: profile?.district ?? "" as FarmerFormValues["district"], town: profile?.town ?? "",
    preferred_language: profile?.preferred_language ?? "en", transport_mode: profile?.transport_mode ?? "other",
    latitude: profile?.latitude?.toString() ?? "", longitude: profile?.longitude?.toString() ?? "",
    vehicle_capacity_kg: profile?.vehicle_capacity_kg?.toString() ?? "",
    estimated_transport_rate: profile?.estimated_transport_rate?.toString() ?? "",
    preferred_market_ids: profile?.preferred_market_ids.join(", ") ?? "",
  };
}
