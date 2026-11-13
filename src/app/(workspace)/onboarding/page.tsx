import { getMapToken } from "@/features/farmer-profile/map-config";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoadingState } from "@/components/states/loading-state";
import { getFarmerProfile } from "@/features/farmer-profile/server";
import { ProfileEditor } from "@/features/farmer-profile/components/profile-editor";

export const metadata = { title: "Set up your farmer profile" };
async function Onboarding() {
  const profile = await getFarmerProfile();
  if (profile) redirect("/dashboard");
  return <ProfileEditor initialProfile={null} mapToken={getMapToken()} onboarding />;
}
export default function Page() {
  return <Suspense fallback={<LoadingState label="Preparing your profile setup…" />}><Onboarding /></Suspense>;
}
