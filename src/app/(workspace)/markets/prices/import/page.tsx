import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { backendRequest } from "@/lib/auth/profile";
import { accessSchema } from "@/features/market-prices/schema";
import { ImportPrices } from "@/features/market-prices/components/import-prices";
import { LoadingState } from "@/components/states/loading-state";
export const metadata = { title: "Import market prices" };
async function AuthorizedImport() {
  const response = await backendRequest("/prices/access");
  if (!response || response.status === 401) redirect("/login");
  if (!response.ok) throw new Error("Import access could not be checked. Please try again.");
  if (!accessSchema.parse(await response.json()).can_import) notFound();
  return <ImportPrices />;
}
export default function Page() { return <Suspense fallback={<LoadingState label="Checking import access…" />}><AuthorizedImport /></Suspense>; }
