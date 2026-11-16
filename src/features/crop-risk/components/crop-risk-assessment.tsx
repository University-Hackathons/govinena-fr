"use client";

import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import type { ProduceBatch } from "@/features/produce/schema";
import { formatBatchDate, sriLankaInputToISO } from "@/features/produce/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { approximateQuantity, remainingTime, riskSchema, storageOptions, type StorageCondition } from "../schema";

type Scenario = { storage_condition: StorageCondition; expected_arrival_at: string | null };
export function CropRiskAssessment({ batch }: { batch: ProduceBatch }) {
  const { user } = useAuth(); const queries = useQueryClient();
  const [storage, setStorage] = useState<StorageCondition>("unknown");
  const [arrival, setArrival] = useState("");
  const [applied, setApplied] = useState<Scenario>({ storage_condition: "unknown", expected_arrival_at: null });
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState("");
  const key = (scenario: Scenario) => ["crop-risk", user.id, batch.id, batch.updated_at, scenario];
  async function evaluate(scenario: Scenario, signal?: AbortSignal) {
    const response = await fetch("/api/crop-risk/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal, body: JSON.stringify({ produce_batch_id: batch.id, ...scenario }) });
    if (!response.ok) throw new Error(response.status === 401 ? "Your session expired. Sign in again." : response.status === 422 ? "Arrival must be at or after the current assessment time. Check the date and Sri Lanka time." : response.status === 404 ? "This batch is unavailable." : "Freshness assessment could not be loaded. Please retry.");
    try { return riskSchema.parse(await response.json()); } catch { throw new Error("Freshness assessment could not be verified. Please retry."); }
  }
  const query = useQuery({ queryKey: key(applied), queryFn: ({ signal }) => evaluate(applied, signal), retry: false, staleTime: 0, refetchInterval: 60000 });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFailure(""); setBusy(true);
    try {
      const scenario: Scenario = { storage_condition: storage, expected_arrival_at: arrival ? sriLankaInputToISO(arrival) : null };
      if (scenario.expected_arrival_at && new Date(scenario.expected_arrival_at).getTime() < Date.now()) throw new Error("Expected arrival must be in the future (Sri Lanka time).");
      const result = await queries.fetchQuery({ queryKey: key(scenario), queryFn: ({ signal }) => evaluate(scenario, signal), staleTime: 0 });
      setApplied(scenario);
      if (result.alternative_accepted) toast.success("Selling urgency assessment updated.");
      else toast.info("This selling alternative is rejected. Review the deadline below.");
    } catch (error) {
      const message = error instanceof TypeError ? "Unable to reach the freshness service. Please retry." : error instanceof Error ? error.message : "Assessment unavailable.";
      setFailure(message); toast.error(message);
    } finally { setBusy(false); }
  }
  const result = query.data;
  let draftArrival: string | null = null;
  try { draftArrival = arrival ? sriLankaInputToISO(arrival) : null; } catch { draftArrival = "invalid"; }
  const changed = storage !== applied.storage_condition || draftArrival !== applied.expected_arrival_at;
  const rejected = result && !result.alternative_accepted;
  return <Card><CardHeader><CardTitle>Freshness and selling urgency</CardTitle><CardDescription>Planning guidance using your saved harvest time and deadline. Assumptions are not scientifically validated predictions or food-safety advice.</CardDescription></CardHeader><CardContent className="space-y-5">
    <form onSubmit={submit} className="space-y-4" aria-label="Freshness assessment settings">
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="risk-storage">Known storage conditions</Label><Select value={storage} items={storageOptions} onValueChange={(value) => setStorage(value as StorageCondition ?? "unknown")} disabled={busy}><SelectTrigger id="risk-storage"><SelectValue /></SelectTrigger><SelectContent>{storageOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Select only known conditions. Any loss calculation assumes these throughout storage.</p></div>
      <div className="space-y-2"><Label htmlFor="risk-arrival">Expected arrival (optional, Sri Lanka time)</Label><Input id="risk-arrival" type="datetime-local" value={arrival} onChange={(event) => setArrival(event.target.value)} disabled={busy} aria-describedby="risk-arrival-help" /><p id="risk-arrival-help" className="text-xs text-muted-foreground">Enter the expected final arrival, including all deliveries. Arrival must be before your deadline.</p></div></div>
      {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Assessing…" : "Update urgency assessment"}</Button>
    </form>
    {query.isPending && <LoadingState label="Assessing selling urgency…" />}
    {query.isError && <ErrorState title="Freshness assessment unavailable" description={query.error.message} onRetry={() => { void query.refetch(); }} />}
    {result && !query.isError && <section aria-label="Selling urgency assessment" className="space-y-4 rounded-lg border p-4" aria-live="polite">
      {changed && <p role="status" className="text-sm font-medium">Settings changed. Update the assessment to apply them.</p>}
      <Badge variant={result.urgency === "high" ? "destructive" : "secondary"}>{result.urgency[0].toUpperCase() + result.urgency.slice(1)} urgency</Badge>
      <p className="text-lg font-semibold">{remainingTime(result.remaining_selling_seconds)}</p>
      {rejected && <p role="alert" className="text-sm font-medium text-destructive">Alternative rejected: {result.rejection_reason === "batch_closed" ? "this batch is sold or archived." : result.rejection_reason === "arrival_at_or_after_deadline" ? "arrival is at or after your hard selling deadline." : "your hard selling deadline has been reached or passed."}</p>}
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Your deadline · farmer input</dt><dd>{formatBatchDate(result.user_deadline)} (Sri Lanka time)</dd><dd>{result.deadline_status === "open" ? "Deadline open" : result.deadline_status === "reached" ? "Deadline reached" : "Deadline passed"}</dd></div>
        <div><dt className="text-muted-foreground">System guidance · operator assumption</dt><dd>{result.guidance_status === "configured" ? `${result.guidance_window_hours} hours from harvest · rule version ${result.profile_version}` : result.guidance_status === "disabled" ? "Crop guidance is disabled. Deadline checks remain available." : "No crop guidance configured. Deadline checks remain available."}</dd></div>
        <div><dt className="text-muted-foreground">Saleable quantity under selected assumptions</dt><dd>{rejected ? "Not estimated for a rejected alternative" : approximateQuantity(result.estimated_saleable_quantity_kg)}</dd></div>
        <div><dt className="text-muted-foreground">Storage used for this assessment</dt><dd>{storageOptions.find((option) => option.value === result.storage_condition)?.label}</dd></div>
        {result.expected_arrival_at && <div><dt className="text-muted-foreground">Expected arrival · farmer input</dt><dd>{formatBatchDate(result.expected_arrival_at)} (Sri Lanka time)</dd><dd>{remainingTime(result.remaining_at_arrival_seconds ?? 0)} at arrival</dd></div>}
      </dl>
      <details><summary className="cursor-pointer font-medium">How this assessment works</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">{result.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ul></details>
      <p className="text-xs text-muted-foreground">Assessed {formatBatchDate(result.assessed_at)} (Sri Lanka time). Refreshes every minute while this page is open. Settings are scenario inputs and are not saved to the batch.</p>
    </section>}
  </CardContent></Card>;
}
