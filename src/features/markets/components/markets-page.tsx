"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MapPin, ArrowUpRight } from "lucide-react";
import { useCrops, useMarkets } from "@/features/catalog/hooks";
import { categories, categoryLabels, marketTypeLabels } from "@/features/catalog/schema";
import { CatalogFilter, CatalogPagination } from "@/features/catalog/components/catalog-controls";
import { districts } from "@/features/farmer-profile/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingState } from "@/components/states/loading-state";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";

function Search({ id, label, placeholder, onSearch }: { id: string; label: string; placeholder: string; onSearch: (value: string) => void }) {
  const [value, setValue] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onSearch(value); }
  return <form onSubmit={submit} className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="flex gap-2"><Input id={id} value={value} onChange={(event) => setValue(event.target.value)} maxLength={100} placeholder={placeholder} type="search" /><Button type="submit">Search</Button></div>
  </form>;
}

function MarketDirectory() {
  const [q, setQ] = useState(""); const [district, setDistrict] = useState(""); const [page, setPage] = useState(1);
  const result = useMarkets({ q, district, page });
  return <section aria-labelledby="market-directory-title" className="space-y-5">
    <h2 id="market-directory-title" className="text-xl font-semibold">Wholesale market directory</h2>
    <div className="grid items-end gap-4 md:grid-cols-[2fr_1fr]">
      <Search id="market-search" label="Search markets" placeholder="Market name, town or district" onSearch={(value) => { setQ(value); setPage(1); }} />
      <div className="space-y-2"><Label htmlFor="market-district">Market district</Label><CatalogFilter id="market-district" label="Market district" allLabel="All districts" value={district} options={districts.map((value) => ({ value, label: value }))} onChange={(value) => { setDistrict(value); setPage(1); }} /></div>
    </div>
    {result.isPending ? <LoadingState label="Loading markets…" /> : result.isError ? <ErrorState title="Markets are unavailable" description={result.error.message} onRetry={() => { void result.refetch(); }} /> : <>
      {result.data.items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {result.data.items.map((market) => <Card key={market.id}>
          <CardHeader><Badge variant="secondary">{market.district}</Badge><CardTitle className="mt-2 leading-6"><Link href={`/markets/${market.id}`} className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{market.name}</Link></CardTitle><CardDescription>{marketTypeLabels[market.market_type]}</CardDescription></CardHeader>
          <CardContent className="space-y-4"><p className="flex gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{market.location}</p><Link href={`/markets/${market.id}`} className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4" aria-label={`View ${market.name}`}>View market details<ArrowUpRight className="size-4" aria-hidden="true" /></Link></CardContent>
        </Card>)}
      </div> : <EmptyState title="No markets found" description={q || district ? "Try a different search or district." : "No active markets are available yet. Please check again later."} />}
      <CatalogPagination page={page} total={result.data.total} pageSize={result.data.page_size} busy={result.isFetching} onChange={setPage} />
    </>}
  </section>;
}

function CropDirectory() {
  const [q, setQ] = useState(""); const [category, setCategory] = useState(""); const [page, setPage] = useState(1);
  const result = useCrops({ q, category, page });
  return <section aria-labelledby="crop-directory-title" className="space-y-5 border-t pt-8">
    <div><h2 id="crop-directory-title" className="text-xl font-semibold">Crop catalog</h2><p className="mt-1 text-sm text-muted-foreground">Browse crop names in English, Sinhala and Tamil.</p></div>
    <div className="grid items-end gap-4 md:grid-cols-[2fr_1fr]">
      <Search id="crop-search" label="Search crops" placeholder="English, සිංහල or தமிழ் name" onSearch={(value) => { setQ(value); setPage(1); }} />
      <div className="space-y-2"><Label htmlFor="crop-category">Crop category</Label><CatalogFilter id="crop-category" label="Crop category" allLabel="All categories" value={category} options={categories.map((value) => ({ value, label: categoryLabels[value] }))} onChange={(value) => { setCategory(value); setPage(1); }} /></div>
    </div>
    {result.isPending ? <LoadingState label="Loading crops…" /> : result.isError ? <ErrorState title="Crops are unavailable" description={result.error.message} onRetry={() => { void result.refetch(); }} /> : <>
      {result.data.items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {result.data.items.map((crop) => <Card key={crop.id}><CardHeader><CardTitle>{crop.name_en}</CardTitle><CardDescription>{categoryLabels[crop.category]} · Default unit: {crop.default_unit}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-x-4 gap-y-2 text-sm"><span lang="si">{crop.name_si}</span><span lang="ta">{crop.name_ta}</span></CardContent></Card>)}
      </div> : <EmptyState title="No crops found" description={q || category ? "Try another crop name or category." : "No active crops are available yet. Please check again later."} />}
      <CatalogPagination page={page} total={result.data.total} pageSize={result.data.page_size} busy={result.isFetching} onChange={setPage} />
    </>}
  </section>;
}

export function MarketsPage() {
  return <div className="mx-auto max-w-7xl space-y-8">
    <header className="space-y-2"><h1 className="text-2xl font-semibold tracking-tight">Markets</h1><p className="max-w-3xl text-sm leading-6 text-muted-foreground">Explore Sri Lankan wholesale markets and crops. This reference directory includes source information; confirm trading arrangements directly before travelling.</p></header>
    <MarketDirectory /><CropDirectory />
  </div>;
}
