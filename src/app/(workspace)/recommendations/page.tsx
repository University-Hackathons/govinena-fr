import type { Metadata } from "next";
import { RecommendationsPage } from "@/features/recommendations/components/recommendations-page";

export const metadata: Metadata = { title: "Recommendations" };

export default function Page() {
  return <RecommendationsPage />;
}
