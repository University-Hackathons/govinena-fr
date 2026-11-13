import { Suspense } from "react";
import Link from "next/link";
import { getMarket } from "@/features/catalog/server";
import { marketTypeLabels } from "@/features/catalog/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/states/loading-state";

export const metadata = { title: "Market details" };
async function MarketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const market = await getMarket(id);
  return <article className="mx-auto max-w-4xl space-y-6">
    <Link href="/markets" className="text-sm underline underline-offset-4">Back to markets</Link>
    <header className="space-y-3"><div className="flex flex-wrap gap-2"><Badge variant="secondary">{market.district}</Badge><Badge variant="outline">{market.active ? "Listed in catalog" : "Inactive listing"}</Badge></div><h1 className="text-2xl font-semibold tracking-tight">{market.name}</h1><p className="text-muted-foreground">{marketTypeLabels[market.market_type]}</p></header>
    <Card><CardHeader><CardTitle>Location</CardTitle></CardHeader><CardContent className="space-y-3"><p>{market.location}</p>
      {market.latitude !== null && market.longitude !== null ? <>
        <p className="text-sm">Verified coordinates: {market.latitude}, {market.longitude}</p>
        <p className="text-sm text-muted-foreground">Verified on {market.coordinates_verified_on}. <a href={market.coordinate_source!} target="_blank" rel="noopener noreferrer" className="underline">Coordinate source</a></p>
      </> : <p className="text-sm text-muted-foreground">Exact coordinates have not been verified. No map pin is shown for this market.</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Sources and verification</CardTitle></CardHeader><CardContent className="space-y-5">
      {market.sources.map((source, index) => <div key={`${source.url}-${index}`} className="space-y-1 text-sm"><a href={source.url} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">{source.title}</a><p className="text-muted-foreground">Reviewed {source.accessed_on}</p><p className="leading-6 text-muted-foreground">{source.note}</p></div>)}
      <p className="text-sm text-muted-foreground">A catalog listing does not confirm today’s opening hours or availability. Verify arrangements with the market before travelling.</p>
    </CardContent></Card>
  </article>;
}
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<LoadingState label="Loading market details…" />}><MarketDetail params={params} /></Suspense>;
}
