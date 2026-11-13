"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { CatalogFilter, CatalogPagination } from "@/features/catalog/components/catalog-controls";
import { produceError } from "../api";
import { producePageSchema, statusLabels, statuses, formatBatchDate } from "../schema";

export function ProducePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState(""); const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); const [page, setPage] = useState(1);
  const query = new URLSearchParams({ page: String(page), page_size: "12" });
  if (q.trim()) query.set("q", q.trim()); if (status) query.set("status", status);
  const result = useQuery({
    // Private data must never reuse another signed-in account's browser cache.
    queryKey: ["produce", user.id, query.toString()], retry: false, staleTime: 0, refetchInterval: 60000,
    queryFn: async ({ signal }) => {
      let response: Response;
      try { response = await fetch(`/api/produce?${query}`, { signal, cache: "no-store" }); }
      catch (error) { if (signal.aborted) throw error; throw new ApiError("Could not reach your produce. Check your connection and try again.", "network"); }
      if (!response.ok) throw new ApiError(produceError(response.status), "http", response.status);
      const data = producePageSchema.safeParse(await response.json());
      if (!data.success) throw new ApiError("The produce response could not be verified. Please try again.", "unknown");
      return data.data;
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setQ(search); setPage(1); }
  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div className="space-y-2"><h1 className="text-2xl font-semibold tracking-tight">Produce</h1><p className="max-w-2xl text-sm text-muted-foreground">Manage your harvest batches, selling deadlines and source locations. All displayed times use Sri Lanka time.</p></div><Button asChild><Link href="/produce/new">Add produce</Link></Button></header>
    <div className="grid items-end gap-4 md:grid-cols-[2fr_1fr]">
      <form onSubmit={submit} className="space-y-2"><Label htmlFor="produce-search">Search produce</Label><div className="flex gap-2"><Input id="produce-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} placeholder="Crop, location, quality or notes" /><Button type="submit">Search</Button></div></form>
      <div className="space-y-2"><Label htmlFor="produce-status">Batch status</Label><CatalogFilter id="produce-status" label="Batch status" value={status} allLabel="Current batches" options={statuses.map((value) => ({ value, label: statusLabels[value] }))} onChange={(value) => { setStatus(value); setPage(1); }} /></div>
    </div>
    {result.isPending ? <LoadingState label="Loading your produce…" /> : result.isError ? <ErrorState title="Your produce is unavailable" description={result.error.message} onRetry={() => { void result.refetch(); }} /> : <>
      {result.data.items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{result.data.items.map((batch) => <Card key={batch.id}>
        <CardHeader><Badge variant={batch.status === "expired" ? "destructive" : "secondary"} className="w-fit">{statusLabels[batch.status]}</Badge><CardTitle className="mt-2"><Link href={`/produce/${batch.id}`} className="underline-offset-4 hover:underline">{batch.crop.name_en} · {batch.quantity_kg.toLocaleString("en-LK")} kg</Link></CardTitle><CardDescription>{batch.source_location.town}, {batch.source_location.district}</CardDescription></CardHeader>
        <CardContent className="space-y-3"><dl className="space-y-2 text-sm"><div><dt className="text-muted-foreground">Harvested</dt><dd>{formatBatchDate(batch.harvested_at)}</dd></div><div><dt className="text-muted-foreground">Sell by</dt><dd>{formatBatchDate(batch.sell_by)}</dd></div></dl>{batch.quality && <p className="break-words text-sm text-muted-foreground">{batch.quality}</p>}<Link href={`/produce/${batch.id}`} className="inline-block text-sm font-medium underline underline-offset-4" aria-label={`View ${batch.crop.name_en} batch ${batch.id}`}>View batch</Link></CardContent>
      </Card>)}</div> : <EmptyState title={q || status ? "No matching produce" : "No produce batches yet"} description={q || status ? "Try another search or status filter." : "Add your first harvest batch to keep track of its quantity and selling deadline."} action={!q && !status ? <Button asChild><Link href="/produce/new">Add your first batch</Link></Button> : undefined} />}
      <CatalogPagination page={page} total={result.data.total} pageSize={result.data.page_size} busy={result.isFetching} onChange={setPage} />
    </>}
    <Card><CardContent className="space-y-3 pt-6"><h2 className="font-medium">Market recommendations</h2><p className="text-sm text-muted-foreground">Recommendations are not available yet. You can manage your batches now.</p><Button disabled>Find a market — coming later</Button></CardContent></Card>
  </div>;
}
