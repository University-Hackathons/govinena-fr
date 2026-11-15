"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CropSelector, MarketSelector } from "@/features/catalog/components/catalog-selectors";
import { CatalogPagination } from "@/features/catalog/components/catalog-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/states/loading-state";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { usePriceQuery } from "../hooks";
import { accessSchema, comparisonSchema, formatPrice, freshnessSchema, historySchema, latestSchema, observationDate, priceQuery, priceTypeLabels, priceTypes, type PriceFilters } from "../schema";
import { FreshnessBadge, PriceTable, Source } from "./price-table";
import { PriceHistoryChart } from "./history-chart";

function Latest({ filters }: { filters: PriceFilters }) {
  const [page, setPage] = useState(1);
  const result = usePriceQuery(`latest?${priceQuery(filters, { page, page_size: 20 })}`, latestSchema);
  if (result.isPending) return <LoadingState label="Loading latest prices…" />;
  if (result.isError) return <ErrorState title="Latest prices unavailable" description={result.error.message} onRetry={() => { void result.refetch(); }} />;
  return <section aria-labelledby="latest-prices" className="space-y-4"><h2 id="latest-prices" className="text-xl font-semibold">Latest observations</h2>
    <p className="text-xs text-muted-foreground">Latest per crop, market, price type, source and grade. “Recent” means within {result.data.stale_after_hours} hours of observation, regardless of import time.</p>
    {result.data.items.length ? <PriceTable items={result.data.items} caption="Price observations are reference information, not guaranteed sale offers." /> : <EmptyState title="No price observations" description="No verified observations match these filters. Missing data is not a zero price." />}
    <CatalogPagination page={page} total={result.data.total} pageSize={result.data.page_size} onChange={setPage} />
  </section>;
}
function Freshness({ filters }: { filters: PriceFilters }) {
  const result = usePriceQuery(`freshness?${priceQuery(filters)}`, freshnessSchema);
  if (result.isPending) return <LoadingState label="Checking price freshness…" className="min-h-20" />;
  if (result.isError) return <ErrorState title="Freshness check unavailable" description={result.error.message} onRetry={() => { void result.refetch(); }} />;
  const summary = result.data;
  return <Card><CardContent className="space-y-3 pt-6"><h2 className="font-semibold">Data freshness and coverage</h2><dl className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">{[["Recent series", summary.fresh_series], ["Outdated series", summary.stale_series], ["Unreported series", summary.missing_series], ["Crop/market pairs without a reported price", summary.pairs_without_reported_price]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 text-xl font-semibold">{value}</dd></div>)}</dl><p className="text-xs text-muted-foreground">Coverage checks active catalog markets and crops in your selection. A new import does not make an old observation current.</p></CardContent></Card>;
}
function Comparison({ filters }: { filters: PriceFilters }) {
  const [page, setPage] = useState(1);
  const result = usePriceQuery(`comparison?${priceQuery(filters, { page, page_size: 12 })}`, comparisonSchema, !!filters.crop_id);
  if (!filters.crop_id) return <p className="text-sm text-muted-foreground">Select a crop to compare market observations.</p>;
  if (result.isPending) return <LoadingState label="Loading market comparisons…" />;
  if (result.isError) return <ErrorState title="Comparison unavailable" description={result.error.message} onRetry={() => { void result.refetch(); }} />;
  return <section className="space-y-4" aria-labelledby="price-comparison"><h2 id="price-comparison" className="text-xl font-semibold">Market comparison</h2><p className="text-xs text-muted-foreground">Sources and qualities are listed separately. No averages or recommendations are calculated.</p><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{result.data.items.map((market) => <Card key={market.market_id}><CardHeader><CardTitle>{market.market_name}</CardTitle></CardHeader><CardContent className="space-y-4">{market.observations.length ? market.observations.map((row) => <div key={row.id} className="space-y-2 border-t pt-3"><p className="font-semibold">{formatPrice(row.price_per_kg)} / kg</p><FreshnessBadge value={row.freshness} /><p className="text-xs text-muted-foreground">{row.quality || "Grade unspecified"} · {observationDate(row)}</p><Source observation={row} /></div>) : <p className="text-sm text-muted-foreground">No reported observation for these filters.</p>}</CardContent></Card>)}</div><CatalogPagination page={page} total={result.data.total} pageSize={result.data.page_size} onChange={setPage} /></section>;
}
function History({ filters }: { filters: PriceFilters }) {
  const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  const [range, setRange] = useState({ start_date: "", end_date: "" });
  const result = usePriceQuery(`history?${priceQuery(filters, range)}`, historySchema, !!filters.crop_id && !!filters.market_id);
  function apply(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setRange({ start_date: start, end_date: end }); }
  return <section aria-labelledby="price-history" className="space-y-4"><h2 id="price-history" className="text-xl font-semibold">Historical prices</h2><p className="text-xs text-muted-foreground">Select a crop and market. The default period is the last 30 days; choose earlier dates for historical imports. Dates use Sri Lanka time.</p>
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3"><div className="min-w-0 space-y-2"><Label htmlFor="history-start">From date</Label><Input id="history-start" type="date" value={start} onChange={(event) => setStart(event.target.value)} /></div><div className="min-w-0 space-y-2"><Label htmlFor="history-end">To date</Label><Input id="history-end" type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></div><Button type="submit" disabled={!filters.crop_id || !filters.market_id}>Apply dates</Button></form>
    {!filters.crop_id || !filters.market_id ? <p className="text-sm text-muted-foreground">Choose both a crop and a market to view history.</p> : result.isPending ? <LoadingState label="Loading historical prices…" /> : result.isError ? <ErrorState title="Historical prices unavailable" description={result.error.message} onRetry={() => { void result.refetch(); }} /> : result.data.items.length ? <>
      {result.data.truncated && <p role="status" className="text-sm text-destructive">Showing the first {result.data.items.length} of {result.data.total} observations. Narrow the dates or source/quality filters to see all observations.</p>}
      {result.data.items.some((row) => row.price_per_kg !== null) ? <PriceHistoryChart history={result.data} /> : <p className="text-sm text-muted-foreground">This period contains only unreported prices. No price line is drawn.</p>}
      <PriceTable items={result.data.items} caption="Historical source observations. Missing days are not estimated." />
    </> : <EmptyState title="No historical observations" description="Try another period or selection. No values are fabricated for dates without records." />}
  </section>;
}
export function PricesPage() {
  const [crop, setCrop] = useState<string | null>(null), [market, setMarket] = useState<string | null>(null);
  const [type, setType] = useState<PriceFilters["price_type"]>("wholesale");
  const [source, setSource] = useState(""), [quality, setQuality] = useState("");
  const [extra, setExtra] = useState({ source_name: "", quality: "" });
  const access = usePriceQuery("access", accessSchema);
  const filters: PriceFilters = { crop_id: crop ?? undefined, market_id: market ?? undefined, price_type: type, ...extra };
  const filterKey = JSON.stringify(filters);
  return <div className="mx-auto max-w-7xl space-y-8"><header className="flex flex-wrap items-start justify-between gap-4"><div className="space-y-2"><Link href="/markets" className="text-sm underline">Back to markets</Link><h1 className="text-2xl font-semibold tracking-tight">Market prices</h1><p className="max-w-3xl text-sm text-muted-foreground">Sourced agricultural price observations in LKR/kg. Wholesale, retail and farmgate values are kept separate. Check observation dates before using the information.</p></div>{access.data?.can_import && <Button asChild><Link href="/markets/prices/import">Import prices</Link></Button>}</header>
    <Card><CardHeader><CardTitle>Price filters</CardTitle></CardHeader><CardContent className="space-y-5"><div className="grid gap-6 md:grid-cols-2"><CropSelector id="price-crop" label="Filter by crop" value={crop} onValueChange={setCrop} /><MarketSelector id="price-market" label="Filter by market" value={market} onValueChange={setMarket} /></div><div className="max-w-sm space-y-2"><Label htmlFor="price-type">Price type</Label><Select value={type} onValueChange={(value) => setType(value ?? "wholesale")} items={priceTypes.map((value) => ({ value, label: priceTypeLabels[value] }))}><SelectTrigger id="price-type"><SelectValue /></SelectTrigger><SelectContent>{priceTypes.map((value) => <SelectItem key={value} value={value}>{priceTypeLabels[value]}</SelectItem>)}</SelectContent></Select></div>
      <details><summary className="cursor-pointer text-sm font-medium">Source and quality filters</summary><form onSubmit={(event) => { event.preventDefault(); setExtra({ source_name: source.trim(), quality: quality.trim() }); }} className="mt-4 grid items-end gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="price-source">Exact source name (optional)</Label><Input id="price-source" value={source} onChange={(event) => setSource(event.target.value)} maxLength={160} /></div><div className="space-y-2"><Label htmlFor="price-quality">Exact grade/quality (optional)</Label><Input id="price-quality" value={quality} onChange={(event) => setQuality(event.target.value)} maxLength={80} /></div><Button type="submit" variant="outline" className="w-fit">Apply source and quality</Button></form></details>
    </CardContent></Card>
    <Freshness key={`fresh-${filterKey}`} filters={filters} /><Latest key={`latest-${filterKey}`} filters={filters} /><Comparison key={`compare-${filterKey}`} filters={filters} /><History filters={filters} />
  </div>;
}
