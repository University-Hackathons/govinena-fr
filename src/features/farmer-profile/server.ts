import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { backendRequest } from "@/lib/auth/profile";
import { farmerProfileSchema } from "./schema";

export const getFarmerProfile = cache(async () => {
  const response = await backendRequest("/farmer/profile");
  if (!response || response.status === 401) redirect("/login");
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Your farmer profile could not be loaded. Please try again.");
  return farmerProfileSchema.parse(await response.json());
});
