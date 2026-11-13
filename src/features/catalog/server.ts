import "server-only";
import { notFound, redirect } from "next/navigation";
import { backendRequest } from "@/lib/auth/profile";
import { catalogID, marketSchema } from "./schema";

export async function getMarket(id: string) {
  if (!catalogID.safeParse(id).success) notFound();
  const response = await backendRequest(`/markets/${id}`);
  if (!response || response.status === 401) redirect("/login");
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("This market could not be loaded. Please try again.");
  return marketSchema.parse(await response.json());
}
