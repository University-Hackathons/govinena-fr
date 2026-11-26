import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getProduce } from "@/features/produce/server";
import { getFarmerProfile } from "@/features/farmer-profile/server";
import { backendRequest } from "@/lib/auth/profile";
import { runSchema } from "@/features/recommendations/schema";
import { MarketComparison } from "@/features/comparisons/components/market-comparison";
import { LoadingState } from "@/components/states/loading-state";
export const metadata = { title: "Generate market recommendation" };
async function Form({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  if (!z.uuid().safeParse(query.batch).success) notFound();
  const [batch, profile] = await Promise.all([getProduce(query.batch as string), getFarmerProfile()]);
  let initial: Record<string, unknown> | undefined, action: { runId: string; revision: number } | undefined;
  if (typeof query.from === "string" && z.uuid().safeParse(query.from).success) {
    const response = await backendRequest(`/agent/runs/${query.from}`);
    if (!response?.ok) throw new Error("Original run could not be loaded.");
    const run = runSchema.parse(await response.json());
    if (run.produce_batch_id !== batch.id) notFound();
    initial = run.constraints;
    if (query.resume === "1" && ["needs_input", "failed"].includes(run.status)) action = { runId: run.id, revision: run.revision };
  }
  return <article className="mx-auto max-w-4xl space-y-6"><h1 className="text-2xl font-semibold">{action ? "Update inputs and resume" : "Generate Recommendation"}</h1><p className="text-sm text-muted-foreground">{batch.crop.name_en} · {batch.quantity_kg} kg. Verified tools determine all figures. The agent cannot execute sales or payments.</p><MarketComparison key={action?.runId ?? batch.id} batch={batch} profile={profile} agentMode initialConstraints={initial} agentAction={action} /></article>;
}
export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { return <Suspense fallback={<LoadingState label="Loading farmer constraints…" />}><Form searchParams={searchParams} /></Suspense>; }
