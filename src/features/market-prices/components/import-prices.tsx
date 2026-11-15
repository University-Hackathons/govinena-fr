"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { CatalogPagination } from "@/features/catalog/components/catalog-controls";
import Loader from "@/components/Loader";
import { usePriceQuery } from "../hooks";
import { auditSchema, importReportSchema, type ImportReport } from "../schema";

function ImportAudit({ report }: { report: ImportReport }) {
  const [page, setPage] = useState(1);
  const result = usePriceQuery(`imports/${report.id}?page=${page}&page_size=25`, auditSchema);
  return <section className="space-y-4" aria-labelledby="import-result"><h2 id="import-result" className="text-xl font-semibold">Import results</h2>
    {report.replayed && <p role="status" className="text-sm">This exact file was imported before. No new observations were written. The original report is shown below.</p>}
    <div role="status" className="flex flex-wrap gap-4 text-sm"><span>Accepted: {report.accepted}</span><span>Duplicates skipped: {report.duplicates}</span><span>Rejected: {report.rejected}</span></div>
    <a href={`/api/prices/imports/${report.id}/file`} download className="text-sm underline">Download original import file</a>
    <p className="break-all text-xs text-muted-foreground">Audit ID: {report.id}</p><p className="text-xs text-muted-foreground">The original file, verification note and row outcomes are retained. Correct rejected rows in a new CSV before importing again.</p>
    {result.isPending ? <LoadingState label="Loading import audit…" /> : result.isError ? <ErrorState title="Audit unavailable" description={result.error.message} onRetry={() => { void result.refetch(); }} /> : <>
      <ol className="space-y-2">{result.data.items.map((row) => <li key={row.row_number} className="rounded-lg border p-3 text-sm"><div className="flex flex-wrap gap-2"><span className="font-medium">{row.row_number === 0 ? "File validation" : `CSV row ${row.row_number}`}</span><span>{row.outcome}</span>{row.error_code && <span className="text-destructive">{row.error_code.replaceAll("_", " ")}</span>}</div><details className="mt-2"><summary className="cursor-pointer text-xs text-muted-foreground">Original source fields</summary><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(row.raw_data, null, 2)}</pre></details></li>)}</ol>
      <CatalogPagination page={page} total={result.data.total} pageSize={result.data.page_size} onChange={setPage} />
    </>}
  </section>;
}
export function ImportPrices() {
  const [file, setFile] = useState<File | null>(null), [note, setNote] = useState(""), [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null); const queries = useQueryClient();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!file || !file.size || file.size > 1048576 || !verified || note.trim().length < 10) {
      const message = "Choose a nonempty CSV up to 1 MiB, enter a verification note, and confirm the source check.";
      setError(message); toast.error(message); return;
    }
    setBusy(true);
    try {
      const query = new URLSearchParams({ verified: "true", verification_note: note.trim(), filename: file.name.slice(0, 120) });
      const response = await fetch(`/api/prices/imports?${query}`, { method: "POST", headers: { "Content-Type": "text/csv" }, body: file });
      if (!response.ok) throw new Error(response.status === 403 ? "Your account is not authorized to import prices." : response.status === 401 ? "Your session expired. Sign in again." : response.status === 413 ? "The CSV exceeds the 1 MiB limit." : "The import could not be completed. If the request timed out, retry the same file to safely retrieve its report.");
      const result = importReportSchema.parse(await response.json()); setReport(result);
      await queries.invalidateQueries({ queryKey: ["market-prices"] });
      if (result.replayed) toast.info("This file was already processed. No new rows were written.");
      else if (result.rejected) toast.warning(`Import finished with ${result.rejected} rejected rows. Review the audit below.`);
      else toast.success("Price import completed.");
    } catch (failure) {
      const message = failure instanceof TypeError ? "Could not reach the import service. Retry the same file to safely retrieve its report if it completed." : failure instanceof Error && !(failure.name === "ZodError") ? failure.message : "The import response could not be verified. Retry the same file before submitting a modified copy.";
      setError(message); toast.error(message);
    } finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-4xl space-y-6"><Link href="/markets/prices" className="text-sm underline">Back to market prices</Link><header className="space-y-2"><h1 className="text-2xl font-semibold">Import market prices</h1><p className="text-sm text-muted-foreground">Admin access only. Check the original source before importing. This importer validates structure and consistency; it does not independently verify a publication’s claims.</p></header>
    <Card><CardHeader><CardTitle>Verified CSV upload</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">UTF-8 CSV, maximum 1 MiB and 2,000 rows. Use kg, g or tonne with an explicit unit quantity. Leave price empty for unreported values; enter 0 only if the source reports zero. Enter a date or an exact timestamp, never both.</p><a href="/samples/verified_prices_sample.csv" download className="inline-block text-sm underline">Download historical CBSL sample CSV</a><p className="text-xs text-muted-foreground">The sample contains Dambulla observations for 29–30 December 2025, from the 30 December CBSL report. It is historical and should appear outdated. Exact publication/observation times are unknown.</p>
      <form onSubmit={submit} className="space-y-4" noValidate><fieldset disabled={busy} className="min-w-0 space-y-4"><legend className="sr-only">Price import verification</legend><div className="space-y-2"><Label htmlFor="price-file">CSV file *</Label><Input id="price-file" type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></div><div className="space-y-2"><Label htmlFor="verification-note">Verification note *</Label><Textarea id="verification-note" value={note} onChange={(event) => setNote(event.target.value)} minLength={10} maxLength={1000} required placeholder="Document/table checked and any mapping or unit decisions" /></div><div className="flex items-start gap-3"><Checkbox id="source-verified" checked={verified} onCheckedChange={setVerified} className="mt-1" /><Label htmlFor="source-verified" className="text-sm leading-6">I checked crop/market mappings, units, values and dates against the cited source.</Label></div><Button type="submit" disabled={busy} aria-busy={busy}>{busy && <Loader size={16} label="Importing price observations" />}{busy ? "Importing…" : "Import CSV"}</Button></fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form>
    </CardContent></Card>
    {report && <ImportAudit key={report.id} report={report} />}
  </div>;
}
