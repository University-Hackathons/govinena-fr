import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getFarmerProfile } from "@/features/farmer-profile/server";
import { getMapToken } from "@/features/farmer-profile/map-config";
import { ProduceForm } from "@/features/produce/components/produce-form";
import { LoadingState } from "@/components/states/loading-state";
export const metadata = { title: "Add produce" };
async function NewProduce() {
  const profile = await getFarmerProfile(); if (!profile) redirect("/onboarding");
  return <ProduceForm initialBatch={null} profile={profile} mapToken={getMapToken()} />;
}
export default function Page() { return <Suspense fallback={<LoadingState label="Preparing produce form…" />}><NewProduce /></Suspense>; }
