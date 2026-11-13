"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { catalogQuery, cropPageSchema, marketPageSchema, cropSchema, marketSchema, type CatalogFilters, type CatalogKind } from "./schema";

export async function fetchCatalog<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  try {
    const response = await fetch(url, { signal, cache: "no-store" });
    if (!response.ok) {
      const message = response.status === 401 ? "Your session expired. Sign in again to view the catalog."
        : response.status === 403 ? "Your account cannot access this catalog."
        : response.status === 422 ? "Check your search and filters, then try again."
        : "The catalog could not be loaded. Please try again shortly.";
      throw new ApiError(message, "http", response.status);
    }
    return schema.parse(await response.json());
  } catch (error) {
    if (signal?.aborted || error instanceof ApiError) throw error;
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      throw new ApiError("The catalog returned an unexpected response. Please try again shortly.", "unknown");
    throw new ApiError("Could not reach the catalog. Check your connection and try again.", "network");
  }
}
export function useCrops(filters: CatalogFilters) {
  const query = catalogQuery(filters);
  return useQuery({ queryKey: ["catalog", "crops", query], queryFn: ({ signal }) => fetchCatalog(`/api/catalog/crops?${query}`, cropPageSchema, signal), retry: false, staleTime: 60000 });
}
export function useMarkets(filters: CatalogFilters) {
  const query = catalogQuery(filters);
  return useQuery({ queryKey: ["catalog", "markets", query], queryFn: ({ signal }) => fetchCatalog(`/api/catalog/markets?${query}`, marketPageSchema, signal), retry: false, staleTime: 60000 });
}
export function useCatalogSelection(kind: CatalogKind, id: string | null, enabled: boolean) {
  return useQuery({ queryKey: ["catalog", kind, "selection", id], enabled: !!id && enabled,
    queryFn: async ({ signal }) => {
      if (kind === "crops") {
        const row = await fetchCatalog(`/api/catalog/crops/${encodeURIComponent(id!)}`, cropSchema, signal);
        return { value: row.id, label: row.name_en, active: row.active };
      }
      const row = await fetchCatalog(`/api/catalog/markets/${encodeURIComponent(id!)}`, marketSchema, signal);
      return { value: row.id, label: row.name, active: row.active };
    }, retry: false, staleTime: 60000,
  });
}
