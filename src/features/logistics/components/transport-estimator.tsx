"use client";

import { useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { MarketSelector } from "@/features/catalog/components/catalog-selectors";
import type { FarmerProfile } from "@/features/farmer-profile/schema";
import type { ProduceBatch } from "@/features/produce/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { LoadingState } from "@/components/states/loading-state";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import Loader from "@/components/Loader";
import { defaults, estimateHistorySchema, formatLKR, logisticsFormSchema, logisticsPayload, logisticsSchema, type LogisticsForm, type LogisticsResult } from "../schema";

function Field({ name, label, error, hint, children }: { name: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return <div className="min-w-0 space-y-2"><Label htmlFor={name}>{label}</Label>{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}{error && <p id={`${name}-error`} role="alert" className="text-sm text-destructive">{error}</p>}</div>;
}
function Results({ result, changed }: { result: LogisticsResult; changed: boolean }) {
  const routeName = { mapbox: "API route estimate · Mapbox", manual: "Manual distance · user input", unavailable: "Route unavailable" }[result.route.source];
  const amount = (value: number | null, unit: string) => value === null ? "Not available" : `${value.toLocaleString("en-LK", { maximumFractionDigits: 3 })} ${unit}`;
  return <section aria-labelledby="transport-result" className="space-y-4 rounded-lg border p-4">
    <h3 id="transport-result" className="font-semibold">Transportation estimate</h3>
    {changed && <p role="status" className="text-sm text-destructive">Inputs changed. Calculate again to update this result.</p>}
    <Badge variant="outline">{routeName}{result.route.cached ? " · cached" : ""}</Badge>
    <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Outbound distance</dt><dd>{amount(result.route.distance_km, "km")}</dd></div><div><dt className="text-muted-foreground">Outbound travel duration</dt><dd>{amount(result.route.duration_minutes, "minutes")}</dd></div>{result.route.return_distance_km !== null && <><div><dt className="text-muted-foreground">Return distance</dt><dd>{amount(result.route.return_distance_km, "km")}{result.route.return_assumed_equal ? " (assumed equal)" : ""}</dd></div><div><dt className="text-muted-foreground">Return travel duration</dt><dd>{amount(result.route.return_duration_minutes, "minutes")}</dd></div></>}<div><dt className="text-muted-foreground">Deliveries for this batch</dt><dd>{result.trips} · {result.trip_loads_kg.map((value) => `${value.toLocaleString("en-LK")} kg`).join(" + ")}</dd></div><div><dt className="text-muted-foreground">Quantity used</dt><dd>{result.quantity_kg.toLocaleString("en-LK")} kg</dd></div></dl>
    {result.breakdown && <div className="space-y-3"><h4 className="font-medium">Calculated from entered charges</h4><dl className="space-y-2 text-sm">{[
      ["Base vehicle charge", result.breakdown.base_charge_lkr], ["Distance charge", result.breakdown.distance_charge_lkr], ["Loading", result.breakdown.loading_lkr], ["Unloading", result.breakdown.unloading_lkr], ["Tolls", result.breakdown.toll_lkr], ["Market handling", result.breakdown.market_handling_lkr], ["Calculated total", result.breakdown.calculated_total_lkr],
    ].map(([name, value]) => <div key={name} className="flex flex-wrap justify-between gap-2"><dt>{name}</dt><dd className="font-medium">{formatLKR(value as number)}</dd></div>)}</dl><p className="text-xs text-muted-foreground">Billable distance across all deliveries: {result.breakdown.billable_distance_km.toLocaleString("en-LK", { maximumFractionDigits: 3 })} km.</p></div>}
    <div className="space-y-1 border-t pt-4"><p className="text-sm font-medium">{result.cost_source === "user_quote" ? "Known whole-batch quote · user input" : result.cost_source === "calculated" ? "Estimated transport cost" : "More input needed"}</p><p className="text-2xl font-semibold">{formatLKR(result.effective_cost_lkr)}</p></div>
    <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{result.messages.map((message, index) => <li key={index}>{message}</li>)}</ul>
    {result.route.source === "mapbox" && <p className="text-xs text-muted-foreground">{result.route.attribution}. Follow road signs and restrictions. Vehicle dimensions, waiting time and truck suitability are not verified by this estimate.</p>}
  </section>;
}
function RecordedInputs({ assumptions }: { assumptions: Record<string, unknown> }) {
  const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const text = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "Not recorded";
  const money = (value: unknown) => (typeof value === "string" || typeof value === "number") && Number.isFinite(Number(value)) ? formatLKR(Number(value)) : "Not provided";
  const tariff = object(assumptions.resolved_tariff), request = object(assumptions.request);
  const location = object(assumptions.source_location);
  const mode = { own_vehicle: "Own vehicle", hired_vehicle: "Hired vehicle", other: "Other" }[String(assumptions.transport_mode) as "own_vehicle" | "hired_vehicle" | "other"] ?? "Not recorded";
  const rows = [
    ["Quantity at calculation", `${text(assumptions.quantity_kg)} kg`],
    ["Vehicle capacity", `${text(assumptions.vehicle_capacity_kg)} kg`],
    ["Deliveries", text(assumptions.trips)], ["Transportation mode", mode],
    ["Distance charging", assumptions.pricing_basis === "round_trip" ? "Outbound and return" : "One way"],
    ["Source location", `${text(location.town)}, ${text(location.district)}`],
    ["Base charge per delivery", money(tariff.base_charge_lkr)], ["Rate per kilometer", money(tariff.rate_per_km_lkr)],
    ["Loading per delivery", money(tariff.loading_lkr)], ["Unloading per delivery", money(tariff.unloading_lkr)],
    ["Tolls per delivery", money(tariff.toll_lkr)], ["Market handling per delivery", money(tariff.market_handling_lkr)],
  ];
  if (request.manual_distance_km !== null && request.manual_distance_km !== undefined) rows.push(["Manual outbound input", `${text(request.manual_distance_km)} km`]);
  if (request.manual_return_distance_km !== null && request.manual_return_distance_km !== undefined) rows.push(["Manual return input", `${text(request.manual_return_distance_km)} km`]);
  if (request.assume_equal_return === true) rows.push(["Manual return assumption", "Same distance as outbound"]);
  if (request.known_quote_lkr !== null && request.known_quote_lkr !== undefined) rows.push(["Whole-batch quote", money(request.known_quote_lkr)], ["Quote description", text(request.quote_note)]);
  return <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">{rows.map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="break-words">{value}</dd></div>)}</dl>;
}

export function TransportEstimator({ batch, profile }: { batch: ProduceBatch; profile: FarmerProfile | null }) {
  const { user } = useAuth(); const queries = useQueryClient();
  const [result, setResult] = useState<LogisticsResult | null>(null), [failure, setFailure] = useState("");
  const { register, control, setValue, reset, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<LogisticsForm>({ resolver: zodResolver(logisticsFormSchema), defaultValues: defaults(profile) });
  const [pricing, capacity] = useWatch({ control, name: ["pricing_basis", "vehicle_capacity_kg"] });
  const history = useQuery({ queryKey: ["logistics-history", user.id, batch.id], retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/logistics/estimates?batch_id=${batch.id}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Saved transport assumptions could not be loaded.");
      try { return estimateHistorySchema.parse(await response.json()); } catch { throw new Error("Saved transport assumptions could not be verified."); }
    },
  });
  function accessibility(name: keyof LogisticsForm) { return { id: name, "aria-invalid": !!errors[name], "aria-describedby": errors[name] ? `${name}-error` : undefined }; }
  function input(name: keyof LogisticsForm, label: string, hint?: string, places = 2) {
    return <Field name={name} label={label} error={errors[name]?.message} hint={hint}><Input {...register(name)} {...accessibility(name)} type="number" min="0" required={name === "vehicle_capacity_kg"} step={places === 3 ? "0.001" : "0.01"} inputMode="decimal" /></Field>;
  }
  function selectField(name: "route_mode" | "pricing_basis" | "transport_mode", options: { value: string; label: string }[]) {
    return <Controller control={control} name={name} render={({ field }) => <Select name={name} value={field.value} disabled={isSubmitting} items={options} onValueChange={(value) => {
      field.onChange(value ?? "");
      if (name === "pricing_basis" && value === "one_way") {
        setValue("manual_return_distance_km", "", { shouldDirty: true }); setValue("manual_return_duration_minutes", "", { shouldDirty: true }); setValue("assume_equal_return", false, { shouldDirty: true });
      }
    }}><SelectTrigger {...accessibility(name)} ref={field.ref} onBlur={field.onBlur}><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>} />;
  }
  function checkbox(name: "allow_multiple_trips" | "assume_equal_return", label: string) {
    return <div className="space-y-2"><div className="flex items-start gap-3"><Controller control={control} name={name} render={({ field }) => <Checkbox id={name} checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} className="mt-1" />} /><Label htmlFor={name} className="text-sm leading-6">{label}</Label></div>{errors[name] && <p role="alert" className="text-sm text-destructive">{errors[name].message}</p>}</div>;
  }
  async function estimate(values: LogisticsForm) {
    setFailure(""); setResult(null);
    try {
      const response = await fetch("/api/logistics/estimate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(logisticsPayload(batch.id, values)) });
      if (!response.ok) {
        if (response.status === 422) {
          const error = await response.json();
          throw new Error(error.error?.code === "logistics_validation" ? error.error.message : "Check capacity, costs, distances and return-trip assumptions.");
        }
        throw new Error(response.status === 401 ? "Your session expired. Sign in again." : response.status === 404 ? "This batch or market is unavailable." : response.status === 409 ? "Archived batches cannot be estimated." : "The estimate could not be completed. Your entries are still here; try again.");
      }
      const data = logisticsSchema.parse(await response.json()); setResult(data); reset(values);
      if (data.status === "complete") { toast.success("Transportation estimate calculated and assumptions saved."); await queries.invalidateQueries({ queryKey: ["logistics-history", user.id, batch.id] }); }
      else toast.info("More input is needed. Review the route and pricing guidance below.");
    } catch (error) {
      const message = error instanceof Error && error.name !== "ZodError" && !(error instanceof TypeError) ? error.message : "The estimate could not be reached or verified. Your entries are still here; please retry.";
      setFailure(message); toast.error(message);
    }
  }
  const capacityNumber = Number(capacity);
  return <Card><CardHeader><CardTitle>Transportation cost</CardTitle><CardDescription>Use your own vehicle charges or a known quote for this batch. Profile preferences are starting values; changes here apply only to this calculation.</CardDescription></CardHeader><CardContent className="space-y-6">
    {batch.status !== "archived" ? <form noValidate onSubmit={handleSubmit(estimate, () => toast.error("Check the highlighted transport fields."))} className="space-y-6"><fieldset disabled={isSubmitting} className="min-w-0 space-y-5"><legend className="sr-only">Transportation preferences and assumptions</legend>
      <p className="text-sm text-muted-foreground">Source: {batch.source_location.town}, {batch.source_location.district}. Batch quantity: {batch.quantity_kg.toLocaleString("en-LK")} kg.</p>
      <Controller control={control} name="market_id" render={({ field }) => <MarketSelector id="transport-market" label="Destination market" value={field.value || null} onValueChange={(value) => field.onChange(value ?? "")} error={errors.market_id?.message} disabled={isSubmitting} required />} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="transport_mode" label="Transportation mode">{selectField("transport_mode", [{ value: "own_vehicle", label: "Own vehicle" }, { value: "hired_vehicle", label: "Hired vehicle" }, { value: "other", label: "Other" }])}</Field>
        {input("vehicle_capacity_kg", "Vehicle capacity in kg *", "Required even with a quote. Loads must fit or explicitly use multiple deliveries.", 3)}
        <Field name="route_mode" label="Distance source">{selectField("route_mode", [{ value: "automatic", label: "Try API route, then manual fallback" }, { value: "manual", label: "Use my known distance" }])}</Field>
        <Field name="pricing_basis" label="Vehicle distance pricing">{selectField("pricing_basis", [{ value: "one_way", label: "Charged for one-way distance" }, { value: "round_trip", label: "Charged for outbound and return distance" }])}</Field>
      </div>
      {Number.isFinite(capacityNumber) && capacityNumber > 0 && batch.quantity_kg > capacityNumber && <p className="text-sm text-muted-foreground">The batch exceeds this capacity and would require {Math.ceil(batch.quantity_kg / capacityNumber)} deliveries.</p>}
      {checkbox("allow_multiple_trips", "Allow multiple deliveries when this batch exceeds vehicle capacity")}
      <div className="space-y-3 rounded-lg border p-4"><h3 className="font-medium">Known road distance or manual fallback</h3><p className="text-xs text-muted-foreground">Automatic routing needs a batch source pin and verified market coordinates. No straight-line distance or travel speed is assumed. Manual values are used when selected or when the API route is unavailable.</p><div className="grid gap-5 sm:grid-cols-2">
        {input("manual_distance_km", "Known outbound distance in km (optional)", "Enter road distance, including an explicit 0 only when appropriate.", 3)}
        {input("manual_duration_minutes", "Known outbound duration in minutes (optional)", "Leave blank if unknown.")}
        {pricing === "round_trip" && <>{input("manual_return_distance_km", "Known return distance in km (optional)", "Return routes can differ from outbound.", 3)}{input("manual_return_duration_minutes", "Known return duration in minutes (optional)")}</>}
      </div>{pricing === "round_trip" && checkbox("assume_equal_return", "For manual costing, assume the return distance equals outbound distance")}</div>
      <div className="space-y-3"><h3 className="font-medium">Vehicle charges in LKR</h3><p className="text-xs text-muted-foreground">Each flat charge applies per delivery. Enter toll/handling totals for the selected one-way or return billing basis. Zero entries assume that component is not charged. A blank km rate uses your profile rate if one exists.</p><div className="grid gap-5 sm:grid-cols-2">
        {input("base_charge_lkr", "Base vehicle charge per delivery (LKR)")}{input("rate_per_km_lkr", "Rate per kilometer (LKR)")}{input("loading_lkr", "Loading charge per delivery (LKR)")}{input("unloading_lkr", "Unloading charge per delivery (LKR)")}{input("toll_lkr", "Tolls per delivery (LKR)")}{input("market_handling_lkr", "Market handling per delivery (LKR)")}
      </div></div>
      <div className="space-y-3 rounded-lg border p-4"><h3 className="font-medium">Known quote override</h3><p className="text-xs text-muted-foreground">Optional all-in quote for the whole batch, including every delivery. It replaces the calculated total and can be used when route information is unavailable.</p><div className="grid gap-5 sm:grid-cols-2">{input("known_quote_lkr", "Known whole-batch quote (LKR, optional)")}<Field name="quote_note" label="Quote description" error={errors.quote_note?.message}><Input {...register("quote_note")} {...accessibility("quote_note")} maxLength={300} placeholder="What the driver agreed to include" /></Field></div></div>
      <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting && <Loader size={16} label="Calculating transportation" />}{isSubmitting ? "Calculating…" : "Estimate transportation"}</Button>
    </fieldset>{failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}</form> : <p className="text-sm text-muted-foreground">This batch is archived. Previously recorded assumptions remain available below.</p>}
    {result && <Results result={result} changed={isDirty} />}
    <section aria-labelledby="recorded-transport" className="space-y-4"><h3 id="recorded-transport" className="font-medium">Recorded transportation assumptions</h3>
      {history.isPending ? <LoadingState label="Loading recorded transport assumptions…" /> : history.isError ? <ErrorState title="Recorded assumptions unavailable" description={history.error.message} onRetry={() => { void history.refetch(); }} /> : history.data.items.length ? <><p className="text-xs text-muted-foreground">Latest 20 records. Each record is a snapshot; later batch or profile edits do not update it. API route results are not retained.</p><div className="space-y-3">{history.data.items.map((record) => {
        const rawCost = record.recorded_result?.effective_cost_lkr;
        const cost = typeof rawCost === "number" || typeof rawCost === "string" ? Number(rawCost) : null;
        return <details key={record.id} className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">{record.market_name} · {new Intl.DateTimeFormat("en-LK", { timeZone: "Asia/Colombo", dateStyle: "medium", timeStyle: "short" }).format(new Date(record.created_at))}</summary><p className="mt-2 text-sm">{cost !== null && Number.isFinite(cost) ? formatLKR(cost) : "Inputs recorded; API route outputs and derived cost were not retained."}</p><RecordedInputs assumptions={record.assumptions} /></details>;
      })}</div></> : <EmptyState title="No transportation assumptions recorded" description="Complete an estimate or enter a known quote to save its inputs for this batch." />}
    </section>
  </CardContent></Card>;
}
