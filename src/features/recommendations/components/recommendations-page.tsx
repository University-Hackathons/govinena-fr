"use client";
import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { EmptyState } from "@/components/states/empty-state";
import { runSchema, statusLabels } from "../schema";
import { formatBatchDate } from "@/features/produce/schema";
export function RecommendationsPage() {
  const { user } = useAuth(); const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["agent-runs", user.id, page], retry: false, queryFn: async ({ signal }) => { const response = await fetch(`/api/agent/runs?page=${page}`, { signal, cache: "no-store" }); if (!response.ok) throw new Error("Recommendation runs could not be loaded."); return z.array(runSchema).parse(await response.json()); } });
  return <article className="mx-auto max-w-4xl space-y-6"><header className="space-y-2"><h1 className="text-2xl font-semibold">Recommendations</h1><p className="text-sm text-muted-foreground">Verified market comparisons with visible tool activity and your explicit decisions. Start from an available produce batch.</p><Button asChild><Link href="/produce">Choose produce batch</Link></Button></header>{query.isPending ? <LoadingState label="Loading recommendation runs…" /> : query.isError ? <ErrorState title="Recommendations unavailable" description={query.error.message} onRetry={() => { void query.refetch(); }} /> : !query.data.length ? <EmptyState title="No recommendation runs" description="Generate a recommendation from an available produce batch to begin." /> : <ul className="space-y-3">{query.data.map((run) => <li key={run.id} className="space-y-2 rounded-lg border p-4"><Link href={`/recommendations/${run.id}`} className="font-semibold underline">{run.recommendation?.market_name ?? "Market recommendation run"}</Link><p className="text-sm">{statusLabels[run.status]} · {run.approval}</p><p className="text-xs text-muted-foreground">{formatBatchDate(run.created_at)} (Sri Lanka time)</p></li>)}</ul>}<nav aria-label="Recommendation pages" className="flex justify-between gap-3"><Button variant="outline" disabled={page === 1 || query.isFetching} onClick={() => setPage((old) => old-1)}>Previous</Button><span className="text-sm">Page {page}</span><Button variant="outline" disabled={!query.data || query.data.length < 20 || query.isFetching} onClick={() => setPage((old) => old+1)}>Next</Button></nav></article>;
}
