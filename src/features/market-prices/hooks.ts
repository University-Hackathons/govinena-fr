"use client";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api-error";

export async function readPrices<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  try {
    const response = await fetch(url, { signal, cache: "no-store" });
    if (!response.ok) throw new ApiError(response.status === 401 ? "Your session expired. Sign in again." : response.status === 403 ? "Only an authorized admin can access imports." : response.status === 422 ? "Check the selected filters and dates. History ranges can span up to 366 days." : "Price data is unavailable. Please try again.", "http", response.status);
    return schema.parse(await response.json());
  } catch (error) {
    if (error instanceof ApiError || signal?.aborted) throw error;
    throw new ApiError("Price data could not be loaded or verified. Check your connection and try again.", "network");
  }
}
export function usePriceQuery<T>(path: string, schema: z.ZodType<T>, enabled = true) {
  const { user } = useAuth();
  return useQuery({ queryKey: ["market-prices", user.id, path], queryFn: ({ signal }) => readPrices(`/api/prices/${path}`, schema, signal), enabled, retry: false, staleTime: 30000, refetchInterval: ["latest?", "freshness?", "comparison?"].some((prefix) => path.startsWith(prefix)) ? 60000 : false });
}
