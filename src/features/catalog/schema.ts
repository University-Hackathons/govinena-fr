import { z } from "zod";

export const categories = ["vegetable", "root_vegetable"] as const;
export const categoryLabels: Record<(typeof categories)[number], string> = {
  vegetable: "Vegetables", root_vegetable: "Root vegetables",
};
export const marketTypeLabels = {
  dedicated_economic_centre: "Dedicated economic centre", wholesale_market: "Wholesale market",
};
export const catalogID = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);
const sourceSchema = z.object({ title: z.string(), url: z.url().refine((url) => /^https?:\/\//.test(url)), accessed_on: z.iso.date(), note: z.string() });
export const cropSchema = z.object({
  id: catalogID, name_en: z.string(), name_si: z.string(), name_ta: z.string(),
  category: z.enum(categories), default_unit: z.literal("kg"), active: z.boolean(),
  sources: z.array(sourceSchema).min(1),
});
export const marketSchema = z.object({
  id: catalogID, name: z.string(), district: z.string(), location: z.string(),
  latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(),
  market_type: z.enum(["dedicated_economic_centre", "wholesale_market"]), active: z.boolean(),
  sources: z.array(sourceSchema).min(1), coordinate_source: z.url().refine((url) => /^https?:\/\//.test(url)).nullable(),
  coordinates_verified_on: z.iso.date().nullable(),
}).refine((row) => {
  const supplied = [row.latitude, row.longitude, row.coordinate_source, row.coordinates_verified_on];
  return supplied.every((value) => value === null) || supplied.every((value) => value !== null);
}, "Coordinates must include a verified source and date.");
const pageMetadata = { total: z.number().int().min(0), page: z.number().int().min(1), page_size: z.number().int().min(1).max(100) };
export const cropPageSchema = z.object({ items: z.array(cropSchema), ...pageMetadata });
export const marketPageSchema = z.object({ items: z.array(marketSchema), ...pageMetadata });
export type Crop = z.infer<typeof cropSchema>;
export type Market = z.infer<typeof marketSchema>;
export type CatalogKind = "crops" | "markets";
export type CatalogFilters = { q?: string; category?: string; district?: string; page?: number; page_size?: number };
export function catalogQuery(filters: CatalogFilters): string {
  const query = new URLSearchParams();
  if (filters.q?.trim()) query.set("q", filters.q.trim());
  if (filters.category) query.set("category", filters.category);
  if (filters.district) query.set("district", filters.district);
  query.set("page", String(filters.page ?? 1));
  query.set("page_size", String(filters.page_size ?? 12));
  return query.toString();
}
