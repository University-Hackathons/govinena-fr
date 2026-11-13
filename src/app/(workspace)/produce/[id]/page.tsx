import { Suspense } from "react";
import Link from "next/link";
import { getProduce } from "@/features/produce/server";
import { formatBatchDate, statusLabels } from "@/features/produce/schema";
import { BatchActions } from "@/features/produce/components/batch-actions";
import { LoadingState } from "@/components/states/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export const metadata = { title: "Produce batch" };
async function BatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const batch = await getProduce((await params).id);
  return <article className="mx-auto max-w-4xl space-y-6">
    <Link href="/produce" className="text-sm underline underline-offset-4">Back to produce</Link>
    <header className="space-y-3"><Badge variant={batch.status === "expired" ? "destructive" : "secondary"}>{statusLabels[batch.status]}</Badge><h1 className="text-2xl font-semibold">{batch.crop.name_en} batch</h1><p className="text-sm text-muted-foreground"><span lang="si">{batch.crop.name_si}</span> · <span lang="ta">{batch.crop.name_ta}</span></p><p className="text-3xl font-semibold">{batch.quantity_kg.toLocaleString("en-LK")} kg</p></header>
    <BatchActions id={batch.id} archived={batch.status === "archived"} />
    <Card><CardHeader><CardTitle>Harvest and sale</CardTitle></CardHeader><CardContent><dl className="grid gap-5 text-sm sm:grid-cols-2">
      <div><dt className="text-muted-foreground">Harvested (Sri Lanka time)</dt><dd className="mt-1">{formatBatchDate(batch.harvested_at)}</dd></div><div><dt className="text-muted-foreground">Latest acceptable sale (Sri Lanka time)</dt><dd className="mt-1">{formatBatchDate(batch.sell_by)}</dd></div><div><dt className="text-muted-foreground">Grade or quality</dt><dd className="mt-1 break-words">{batch.quality ?? "Not provided"}</dd></div>{batch.archived_at && <div><dt className="text-muted-foreground">Archived</dt><dd className="mt-1">{formatBatchDate(batch.archived_at)}</dd></div>}
    </dl></CardContent></Card>
    <Card><CardHeader><CardTitle>Source location</CardTitle></CardHeader><CardContent className="space-y-2"><p>{batch.source_location.town}, {batch.source_location.district}</p><p className="text-sm text-muted-foreground">{batch.source_location.latitude === null ? "No optional map pin saved." : "An approximate source pin is saved. You can view it when editing this batch."}</p></CardContent></Card>
    <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap break-words text-sm">{batch.notes ?? "No notes added."}</p></CardContent></Card>
    <Card><CardHeader><CardTitle>Market recommendations</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Recommendations will be available in a later feature.</p><Button disabled>Find a market — coming later</Button></CardContent></Card>
  </article>;
}
export default function Page({ params }: { params: Promise<{ id: string }> }) { return <Suspense fallback={<LoadingState label="Loading produce batch…" />}><BatchDetail params={params} /></Suspense>; }
