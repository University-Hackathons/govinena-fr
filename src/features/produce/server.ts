import "server-only";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { backendRequest } from "@/lib/auth/profile";
import { produceSchema } from "./schema";
export async function getProduce(id: string) {
  if (!z.uuid().safeParse(id).success) notFound();
  const response = await backendRequest(`/produce/${id}`);
  if (!response || response.status === 401) redirect("/login");
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("This produce batch could not be loaded. Please try again.");
  return produceSchema.parse(await response.json());
}
