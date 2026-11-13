import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getFarmerProfile } from "@/features/farmer-profile/server";
import { getMapToken } from "@/features/farmer-profile/map-config";
import { getProduce } from "@/features/produce/server";
import { ProduceForm } from "@/features/produce/components/produce-form";
import { LoadingState } from "@/components/states/loading-state";
export const metadata = { title: "Edit produce" };
async function EditProduce({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [batch, profile] = await Promise.all([getProduce(id), getFarmerProfile()]);
  if (!profile) redirect("/onboarding");
  if (batch.status === "archived") return <div className="space-y-4"><h1 className="text-2xl font-semibold">This batch is archived</h1><p>Archived batches are read-only.</p><Link href={`/produce/${id}`} className="underline">View batch</Link></div>;
  return <ProduceForm initialBatch={batch} profile={profile} mapToken={getMapToken()} />;
}
export default function Page({ params }: { params: Promise<{ id: string }> }) { return <Suspense fallback={<LoadingState label="Loading produce editor…" />}><EditProduce params={params} /></Suspense>; }
