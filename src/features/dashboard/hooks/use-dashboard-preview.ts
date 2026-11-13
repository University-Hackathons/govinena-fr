"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardPreview } from "@/features/dashboard/services/preview-service";

export const dashboardKeys = {
  preview: ["dashboard", "local-preview"] as const,
};

export function useDashboardPreview() {
  return useQuery({
    queryKey: dashboardKeys.preview,
    queryFn: getDashboardPreview,
  });
}
