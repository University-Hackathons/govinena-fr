import type { DashboardPreview } from "@/features/dashboard/types";

// Deliberate local fixtures, not API fallbacks. No network or real market values.
const preview: DashboardPreview = {
  trend: [
    { label: "Mon", value: 40 },
    { label: "Tue", value: 58 },
    { label: "Wed", value: 48 },
    { label: "Thu", value: 72 },
    { label: "Fri", value: 65 },
    { label: "Sat", value: 82 },
  ],
  markets: [
    { produce: "Tomato", market: "Dambulla", status: "Sample row" },
    { produce: "Carrot", market: "Nuwara Eliya", status: "Sample row" },
    { produce: "Rice", market: "Colombo", status: "Sample row" },
  ],
};

export function getDashboardPreview(): Promise<DashboardPreview> {
  return Promise.resolve(preview);
}
