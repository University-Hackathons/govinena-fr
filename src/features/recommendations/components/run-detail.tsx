"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { comparisonSchema, formatComparisonLKR } from "@/features/comparisons/schema";
import { ComparisonResults } from "@/features/comparisons/components/market-comparison";
import { formatBatchDate } from "@/features/produce/schema";
import { runSchema, statusLabels, toolLabels, isProcessing } from "../schema";

export function RunDetail({ id }: { id: string }) {
  const { user } = useAuth(); const [busy, setBusy] = useState(false);
  const query = useQuery({ queryKey: ["agent-run", user.id, id], retry: false, queryFn: async ({ signal }) => {
    const response = await fetch(`/api/agent/runs/${encodeURIComponent(id)}`, { signal, cache: "no-store" });
    if (!response.ok) throw new Error(response.status === 404 ? "This run is unavailable." : "Recommendation could not be loaded. Please retry.");
    return runSchema.parse(await response.json());
  }, refetchInterval: (query) => query.state.data && isProcessing(query.state.data.status) ? 1500 : false });
  async function action(name: "accept" | "reject" | "resume") {
    if (!query.data) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/agent/runs/${id}/${name === "resume" ? "resume" : "decision"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: query.data.revision, ...(name !== "resume" ? { action: name } : {}) }) });
      if (!response.ok) throw new Error(response.status === 409 ? "This run changed, exceeded its limits, or the recommendation is no longer current. Reload or create a new run." : "The action could not be saved. Please retry.");
      await query.refetch(); toast.success(name === "resume" ? "Run queued for checkpoint recovery." : `Recommendation ${name === "accept" ? "accepted" : "rejected"}. No sale or payment was arranged.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Action unavailable."); } finally { setBusy(false); }
  }
  if (query.isPending) return <LoadingState label="Loading recommendation run…" />;
  if (query.isError) return <ErrorState title="Recommendation unavailable" description={query.error.message} onRetry={() => { void query.refetch(); }} />;
  const run = query.data; const comparison = comparisonSchema.safeParse(run.comparison);
  return <article className="mx-auto max-w-4xl space-y-6"><Link href="/recommendations" className="text-sm underline">Back to recommendations</Link>
    <header className="space-y-3"><h1 className="text-2xl font-semibold">Market recommendation</h1><Badge variant={run.status === "failed" ? "destructive" : "secondary"}>{statusLabels[run.status]}</Badge><p className="text-sm text-muted-foreground">{run.mode === "mock" ? "Deterministic mock-agent mode · real verified tools, no LLM" : "LLM-assisted planning and grounded explanation · verified numeric tools"}</p><p className="text-sm">Approval: {run.approval}. Updated {formatBatchDate(run.updated_at)} (Sri Lanka time).</p></header>
    {isProcessing(run.status) && <><LoadingState label="The agent is checking verified services…" /><p className="text-sm text-muted-foreground">Runs are checkpointed. If processing remains interrupted after a server restart, retry recovery once the execution lease has expired (up to ten minutes).</p><Button variant="outline" disabled={busy} onClick={() => { void action("resume"); }}>Recover interrupted run</Button></>}
    {!!run.missing_inputs.length && <Card><CardHeader><CardTitle>Information needed</CardTitle></CardHeader><CardContent className="space-y-3"><ul className="list-disc space-y-2 pl-5 text-sm">{run.missing_inputs.map((text) => <li key={text}>{text}</li>)}</ul><p className="text-sm text-muted-foreground">Review the constraints, provide the missing information or refresh verified price data, then resume. Unknown data is never replaced by invented values.</p></CardContent></Card>}
    {!!run.warnings.length && <div role="status" className="rounded-lg border p-4"><ul className="list-disc space-y-2 pl-5 text-sm">{run.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
    {run.recommendation && <Card><CardHeader><CardTitle>{run.recommendation.market_name}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Estimated net proceeds under the recorded comparison assumptions</p><p className="text-3xl font-semibold">{formatComparisonLKR(run.recommendation.expected_net_proceeds_lkr)}</p><p className="text-sm leading-6">{run.recommendation.explanation}</p>{run.status === "completed" && run.approval === "pending" && <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => { void action("accept"); }}>Accept recommendation</Button><Button variant="outline" disabled={busy} onClick={() => { void action("reject"); }}>Reject recommendation</Button></div>}<p className="text-xs text-muted-foreground">Accept/reject records your decision only. No financial transaction, transport booking or sale is performed. Acceptance is blocked when batch facts or freshness/deadlines have changed.</p></CardContent></Card>}
    <div className="flex flex-wrap gap-3"><Button variant="outline" asChild><Link href={`/recommendations/new?batch=${run.produce_batch_id}&from=${run.id}${["needs_input", "failed"].includes(run.status) ? "&resume=1" : ""}`}>Modify Constraints</Link></Button>{["needs_input", "failed"].includes(run.status) && <Button variant="outline" disabled={busy} onClick={() => { void action("resume"); }}>Retry with current constraints</Button>}<Button variant="ghost" asChild><Link href={`/produce/${run.produce_batch_id}`}>View produce batch</Link></Button></div>
    <Card><CardHeader><CardTitle>Agent activity</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Actual verified tool calls and concise stage summaries. No hidden model chain-of-thought is stored or displayed.</p>{!run.tool_outcomes.length ? <p className="text-sm">No tool calls have completed yet.</p> : <ol className="space-y-4 border-l pl-4">{run.tool_outcomes.map((item, index) => <li key={index} className="space-y-1"><h3 className="font-medium">{toolLabels[item.tool] ?? item.tool} · {item.status.replace("_", " ")}</h3><p className="text-sm">{item.summary}</p><p className="text-xs text-muted-foreground">Attempt {item.attempt} · {formatBatchDate(item.completed_at)} (Sri Lanka time)</p></li>)}</ol>}<details><summary className="cursor-pointer text-sm font-medium">Workflow stages ({run.steps} steps)</summary><ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">{run.decision_summaries.map((summary, index) => <li key={index}>{summary}</li>)}</ol></details></CardContent></Card>
    {comparison.success && <ComparisonResults result={comparison.data} />}
  </article>;
}
