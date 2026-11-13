import { getMapToken } from "@/features/farmer-profile/map-config";
import { Suspense } from "react";
import { LoadingState } from "@/components/states/loading-state";
import { getFarmerProfile } from "@/features/farmer-profile/server";
import { ProfileEditor } from "@/features/farmer-profile/components/profile-editor";

export const metadata = { title: "Farmer profile" };
async function Profile() {
  const profile = await getFarmerProfile();
  return <ProfileEditor initialProfile={profile} mapToken={getMapToken()} />;
}
export default function Page() {
  return <Suspense fallback={<LoadingState label="Loading your farmer profile…" />}><Profile /></Suspense>;
}
