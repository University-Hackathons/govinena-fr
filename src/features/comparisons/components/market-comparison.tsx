"use client";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import type { FarmerProfile } from "@/features/farmer-profile/schema";
import { type ProduceBatch, formatBatchDate, sriLankaInputToISO } from "@/features/produce/schema";
import { defaults, logisticsFormSchema, logisticsPayload, type LogisticsForm } from "@/features/logistics/schema";
import { storageOptions } from "@/features/crop-risk/schema";
import { MarketSelector } from "@/features/catalog/components/catalog-selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { EmptyState } from "@/components/states/empty-state";
import { additionalFeeSchema, comparisonSchema, uniqueCandidates, formatComparisonLKR as formatLKR, type ComparisonResult } from "../schema";

type Candidate = { market_id: string; manual_distance_km: string; manual_duration_minutes: string; manual_return_distance_km: string; known_quote_lkr: string; quote_note: string; arrival: string; fee: string };
const blank = (): Candidate => ({ market_id: "", manual_distance_km: "", manual_duration_minutes: "", manual_return_distance_km: "", known_quote_lkr: "", quote_note: "", arrival: "", fee: "0" });
function Results({ result }: { result: ComparisonResult }) {
  return <section aria-label="Market comparison results" className="space-y-5">
    <header className="space-y-2"><h3 className="text-lg font-semibold">Ranked observed-price scenarios</h3><p className="text-sm text-muted-foreground">Historical assessment: {formatBatchDate(result.assessed_at)} (Sri Lanka time). Prices must be no older than {result.price_max_age_hours} hours at assessment and arrival. Grade: {result.quality || "Unspecified"} · {result.price_type} · LKR/kg.</p><p className="text-sm">These are scenarios using recorded observations. Actual future prices and sales are unknown. Recalculate when inputs or data change.</p></header>
    {!result.eligible.length && <EmptyState title="No eligible markets" description="Review the exclusions below. Add missing transport, arrival or loss assumptions, or wait for suitable verified price data." />}
    <div className="grid gap-4">{result.eligible.map((option) => <article key={option.market_id} className="min-w-0 space-y-4 rounded-xl border p-4 sm:p-5" aria-label={`Rank ${option.rank}: ${option.market_name}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">#{option.rank} · {option.market_name}</h4><Badge variant={option.risk.urgency === "high" ? "destructive" : "secondary"}>{option.risk.urgency} urgency</Badge></div>
      <p className="text-sm">Expected net proceeds under assumptions</p><p className="break-words text-2xl font-semibold">{formatLKR(option.expected_net_proceeds_lkr)}</p>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">{[
        ["Saleable quantity · assumed", `${option.expected_saleable_quantity_kg.toLocaleString("en-LK", { maximumFractionDigits: 1 })} kg (${option.quantity_basis === "explicit_no_loss" ? "explicit no-loss scenario" : `crop rule v${option.risk.profile_version}`})`],
        ["Recorded observed price", `${formatLKR(option.price.price_per_kg)} / kg`], ["Expected gross revenue", formatLKR(option.expected_gross_revenue_lkr)],
        ["Transport incl. entered trip fees", formatLKR(option.transport_cost_lkr)], ["Additional whole-batch market fees", formatLKR(option.additional_market_cost_lkr)], ["Total costs", formatLKR(option.total_cost_lkr)],
        ["Expected arrival", `${formatBatchDate(option.arrival_at)} (${option.arrival_source === "user_input" ? "user input" : "route-duration estimate"})`],
        ["Data freshness", `${option.price.freshness} · about ${option.price.age_hours.toFixed(1)} hours old at assessment`],
      ].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>
      <details><summary className="cursor-pointer font-medium">Price source and timestamps</summary><dl className="mt-3 space-y-2 break-words text-sm"><div><dt>Source</dt><dd>{option.price.source_name}</dd><dd className="[overflow-wrap:anywhere]">{option.price.source_url || option.price.document_reference}</dd></div><div><dt>Observed (Sri Lanka time)</dt><dd>{formatBatchDate(option.price.observed_at)} ({option.price.observation_precision === "day" ? "day-only observation; time is not known" : "timestamp"})</dd></div><div><dt>Source publication</dt><dd>{option.price.source_published_at ? formatBatchDate(option.price.source_published_at) : `${option.price.source_publication_date} (date only)`}</dd></div><div><dt>Imported (Sri Lanka time)</dt><dd>{formatBatchDate(option.price.imported_at)}</dd></div></dl></details>
      <details><summary className="cursor-pointer font-medium">Transport and cost breakdown</summary><div className="mt-3 space-y-3 text-sm"><p>{option.transport.cost_source === "user_quote" ? "Known whole-batch quote · user input (replaces calculated transport total)" : "Calculated transport scenario"} · {option.transport.trips} deliveries · {option.transport.route.source === "mapbox" ? "Mapbox API route estimate" : option.transport.route.source === "manual" ? "Manual distance · user input" : "Route unavailable; explicit arrival and quote used"}</p><p>Outbound distance: {option.transport.route.distance_km === null ? "Unknown" : `${option.transport.route.distance_km} km`}. Travel duration: {option.transport.route.duration_minutes === null ? "Unknown" : `${option.transport.route.duration_minutes} minutes`}.</p>{option.transport.breakdown && <dl className="space-y-2">{Object.entries({ "Vehicle base charges": option.transport.breakdown.base_charge_lkr, "Distance charge": option.transport.breakdown.distance_charge_lkr, Loading: option.transport.breakdown.loading_lkr, Unloading: option.transport.breakdown.unloading_lkr, Tolls: option.transport.breakdown.toll_lkr, "Handling included in transport": option.transport.breakdown.market_handling_lkr, "Calculated transport total": option.transport.breakdown.calculated_total_lkr }).map(([name, amount]) => <div key={name} className="flex flex-wrap justify-between gap-2"><dt>{name}</dt><dd>{formatLKR(amount)}</dd></div>)}</dl>}<p>Net = rounded gross − effective transport − additional market fees. Quote and calculated total are never added together.</p>{option.transport.route.attribution && <p>{option.transport.route.attribution}</p>}</div></details>
      <details><summary className="cursor-pointer font-medium">Assumptions and risk explanation</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground [overflow-wrap:anywhere]">{[...option.assumptions, ...option.transport.messages, ...option.risk.assumptions].map((text, index) => <li key={index}>{text}</li>)}</ul></details>
    </article>)}</div>
    <section aria-label="Excluded markets" className="space-y-3"><h3 className="font-semibold">Excluded alternatives ({result.excluded.length})</h3>{!result.excluded.length ? <p className="text-sm text-muted-foreground">No selected markets were excluded.</p> : result.excluded.map((market) => <article key={market.market_id} className="space-y-2 rounded-lg border p-4"><h4 className="font-medium">{market.market_name}</h4><p className="text-sm">{market.reason}</p>{market.price && <p className="text-xs text-muted-foreground">Source: {market.price.source_name} · observed {formatBatchDate(market.price.observed_at)} (Sri Lanka time) · {market.price.freshness}</p>}{market.transport?.messages.map((text, index) => <p key={index} className="text-xs text-muted-foreground">{text}</p>)}</article>)}</section>
    <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{result.assumptions.map((text) => <li key={text}>{text}</li>)}</ul><p className="text-xs text-muted-foreground">{result.snapshot_note}</p>
  </section>;
}

export function MarketComparison({ batch, profile }: { batch: ProduceBatch; profile: FarmerProfile | null }) {
  const { user } = useAuth(); const router = useRouter(); const pathname = usePathname(); const params = useSearchParams();
  const snapshotID = params.get("comparison");
  const [common, setCommon] = useState(() => defaults(profile));
  const [candidates, setCandidates] = useState<Candidate[]>([blank()]);
  const [storage, setStorage] = useState("unknown"), [priceType, setPriceType] = useState("wholesale"), [noLoss, setNoLoss] = useState(false);
  const [latest, setLatest] = useState<ComparisonResult | null>(null), [busy, setBusy] = useState(false), [failure, setFailure] = useState("");
  const [changed, setChanged] = useState(false);
  const saved = useQuery({ queryKey: ["comparison-snapshot", user.id, batch.id, snapshotID], enabled: !!snapshotID, retry: false, queryFn: async ({ signal }) => {
    const response = await fetch(`/api/comparisons/${encodeURIComponent(snapshotID!)}`, { signal, cache: "no-store" });
    if (!response.ok) throw new Error("Saved comparison could not be loaded. Recalculate or try again.");
    const data = comparisonSchema.parse(await response.json());
    if (data.produce_batch_id !== batch.id) throw new Error("This snapshot belongs to a different batch.");
    return data;
  } });
  const result = latest ?? saved.data;
  function updateCommon(name: keyof LogisticsForm, value: string | boolean) { setCommon((old) => ({ ...old, [name]: value })); setChanged(true); }
  function updateRow(index: number, name: keyof Candidate, value: string) { setCandidates((old) => old.map((row, i) => i === index ? { ...row, [name]: value } : row)); setChanged(true); }
  function numberField(name: keyof LogisticsForm, label: string, step = "0.01") { return <div className="space-y-2"><Label htmlFor={`comparison-${name}`}>{label}</Label><Input id={`comparison-${name}`} value={String(common[name])} onChange={(event) => updateCommon(name, event.target.value)} type="number" min="0" step={step} inputMode="decimal" disabled={busy} /></div>; }
  function choice(label: string, id: string, value: string, options: { value: string; label: string }[], onChange: (value: string) => void) { return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Select value={value} items={options} disabled={busy} onValueChange={(value) => { onChange(value ?? ""); setChanged(true); }}><SelectTrigger id={id}><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>; }
  async function compare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFailure(""); setBusy(true);
    try {
      if (!uniqueCandidates(candidates.map((row) => row.market_id))) throw new Error("Select 1–20 different candidate markets.");
      const overrides = candidates.map((row, index) => {
        const parsed = logisticsFormSchema.safeParse({ ...common, ...row, route_mode: row.manual_distance_km ? "manual" : "automatic", manual_return_distance_km: common.pricing_basis === "round_trip" ? row.manual_return_distance_km : "", manual_return_duration_minutes: "", assume_equal_return: false });
        if (!parsed.success) throw new Error(`Market ${index + 1}: ${parsed.error.issues[0].message}`);
        if (!additionalFeeSchema.safeParse(row.fee).success) throw new Error(`Market ${index + 1}: enter valid additional fees with at most two decimals.`);
        const payload = logisticsPayload(batch.id, parsed.data);
        const { produce_batch_id: _batchID, market_id: _marketID, ...transport } = payload;
        void _batchID; void _marketID;
        return { market_id: row.market_id, transport, additional_market_fee_lkr: row.fee || "0", expected_arrival_at: row.arrival ? sriLankaInputToISO(row.arrival) : null };
      });
      const response = await fetch("/api/comparisons", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ produce_batch_id: batch.id, market_ids: candidates.map((row) => row.market_id), price_type: priceType, storage_condition: storage, assume_no_loss: noLoss, market_overrides: overrides }) });
      if (!response.ok) throw new Error(response.status === 401 ? "Your session expired. Sign in again." : response.status === 422 ? "Check the selected markets, capacity, dates, distances and quotes." : response.status === 404 ? "This batch is unavailable." : "The comparison could not be completed. Your inputs remain here; please retry.");
      const data = comparisonSchema.parse(await response.json()); setLatest(data); setChanged(false);
      const nextParams = new URLSearchParams(params.toString());
      if (data.snapshot_id) nextParams.set("comparison", data.snapshot_id); else nextParams.delete("comparison");
      router.replace(`${pathname}${nextParams.size ? `?${nextParams}` : ""}`, { scroll: false });
      if (data.eligible.length) toast.success("Market comparison calculated."); else toast.info("No eligible markets. Review the exclusion reasons.");
    } catch (error) {
      const message = error instanceof Error && error.name !== "ZodError" && !(error instanceof TypeError) ? error.message : "The comparison could not be reached or verified. Please retry.";
      setFailure(message); toast.error(message);
    } finally { setBusy(false); }
  }
  const closed = ["sold", "archived"].includes(batch.status);
  return <Card id="market-comparison"><CardHeader><CardTitle>Compare Markets</CardTitle><CardDescription>Compare expected net proceeds using recorded prices and explicit transport and crop assumptions. This is deterministic arithmetic, not a forecast.</CardDescription></CardHeader><CardContent className="space-y-6">
    {closed ? <p className="text-sm text-muted-foreground">This batch is sold or archived. Saved comparisons remain historical records.</p> : <form onSubmit={compare} aria-label="Market comparison settings" className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">{choice("Comparison price type", "comparison-type", priceType, ["wholesale", "retail", "farmgate"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })), setPriceType)}{choice("Storage for comparison", "comparison-storage", storage, [...storageOptions], setStorage)}</div>
      <div className="space-y-2"><div className="flex items-start gap-3"><Checkbox id="comparison-no-loss" checked={noLoss} disabled={busy} onCheckedChange={(checked) => { setNoLoss(checked); setChanged(true); }} /><Label htmlFor="comparison-no-loss" className="leading-6">Explicitly assume no quantity loss for this scenario</Label></div><p className="text-xs text-muted-foreground">Otherwise an applicable crop/storage loss rule is required. This assumption never extends your deadline.</p></div>
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-2 font-medium">Shared vehicle and per-delivery charges</legend><div className="grid gap-4 sm:grid-cols-2">{numberField("vehicle_capacity_kg", "Comparison vehicle capacity (kg)", "0.001")}{choice("Comparison distance pricing", "comparison-basis", common.pricing_basis, [{ value: "one_way", label: "One way" }, { value: "round_trip", label: "Outbound and return" }], (value) => updateCommon("pricing_basis", value))}{numberField("rate_per_km_lkr", "Comparison rate per km (LKR)")}{numberField("base_charge_lkr", "Comparison base vehicle charge (LKR)")}{numberField("loading_lkr", "Comparison loading per delivery (LKR)")}{numberField("unloading_lkr", "Comparison unloading per delivery (LKR)")}{numberField("toll_lkr", "Comparison tolls per delivery (LKR)")}{numberField("market_handling_lkr", "Handling included in transport per delivery (LKR)")}</div><div className="flex items-start gap-3"><Checkbox id="comparison-multiple" checked={common.allow_multiple_trips} disabled={busy} onCheckedChange={(value) => updateCommon("allow_multiple_trips", value)} /><Label htmlFor="comparison-multiple" className="leading-6">Allow multiple deliveries (enter an explicit final arrival per market)</Label></div><p className="text-xs text-muted-foreground">Profile capacity and rate are prefilled when available. Blank flat charges assume zero; verify loading, tolls and handling. Quotes cover the entire batch and all deliveries, replacing calculated transport charges.</p></fieldset>
      {candidates.map((row, index) => <fieldset key={index} className="min-w-0 space-y-4 rounded-lg border p-4"><legend className="px-2 font-medium">Candidate market {index + 1}</legend><MarketSelector id={`comparison-market-${index}`} label={`Candidate market ${index + 1}`} value={row.market_id || null} onValueChange={(value) => updateRow(index, "market_id", value ?? "")} disabled={busy} required />
        <div className="grid gap-4 sm:grid-cols-2">{([ ["manual_distance_km", "Known outbound distance (km)", "0.001"], ["manual_duration_minutes", "Known outbound duration (minutes)", "0.01"], ...(common.pricing_basis === "round_trip" ? [["manual_return_distance_km", "Known return distance (km)", "0.001"]] : []), ["known_quote_lkr", "Whole-batch transport quote (LKR)", "0.01"], ["fee", "Additional whole-batch market fees (LKR)", "0.01"] ] as [keyof Candidate, string, string][]).map(([name, label, step]) => <div key={name} className="space-y-2"><Label htmlFor={`comparison-${index}-${name}`}>{label} · market {index + 1}</Label><Input id={`comparison-${index}-${name}`} value={row[name]} onChange={(event) => updateRow(index, name, event.target.value)} disabled={busy} type="number" min="0" step={step} inputMode="decimal" /></div>)}
        <div className="space-y-2"><Label htmlFor={`comparison-${index}-quote`}>Quote description · market {index + 1}</Label><Input id={`comparison-${index}-quote`} maxLength={300} value={row.quote_note} onChange={(event) => updateRow(index, "quote_note", event.target.value)} disabled={busy} /></div><div className="space-y-2"><Label htmlFor={`comparison-${index}-arrival`}>Expected final arrival (Sri Lanka time) · market {index + 1}</Label><Input id={`comparison-${index}-arrival`} type="datetime-local" value={row.arrival} onChange={(event) => updateRow(index, "arrival", event.target.value)} disabled={busy} /></div></div>
        <p className="text-xs text-muted-foreground">Leave distance blank to try configured routing. A quote without route duration needs an explicit arrival. Enter only additional fees not already covered by transport; zero assumes no extra fees.</p>{candidates.length > 1 && <Button type="button" variant="outline" disabled={busy} onClick={() => { setCandidates((old) => old.filter((_, i) => i !== index)); setChanged(true); }}>Remove candidate {index + 1}</Button>}
      </fieldset>)}
      <Button type="button" variant="outline" disabled={busy || candidates.length >= 20} onClick={() => { setCandidates((old) => [...old, blank()]); setChanged(true); }}>Add candidate market</Button>
      {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}<div><Button disabled={busy} type="submit">{busy ? "Comparing markets…" : "Compare Markets"}</Button></div>
    </form>}
    {busy && <LoadingState label="Comparing selected markets…" />}
    {snapshotID && saved.isPending && !latest && <LoadingState label="Loading saved comparison…" />}
    {saved.isError && !latest && <ErrorState title="Saved comparison unavailable" description="Recalculate or retry loading this historical snapshot." onRetry={() => { void saved.refetch(); }} />}
    {result && <>{changed && <p role="status" className="text-sm font-medium">Inputs changed. Recalculate to update the comparison below.</p>}<Results result={result} /></>}
  </CardContent></Card>;
}
