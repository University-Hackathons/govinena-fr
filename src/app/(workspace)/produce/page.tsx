import type { Metadata } from "next";
import { ProducePage } from "@/features/produce/components/produce-page";

export const metadata: Metadata = { title: "Produce" };

export default function Page() {
  return <ProducePage />;
}
