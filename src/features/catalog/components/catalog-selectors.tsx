"use client";

import { useState } from "react";
import { useCrops, useMarkets, useCatalogSelection } from "../hooks";
import { type CatalogKind } from "../schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";
import { CatalogPagination } from "./catalog-controls";

type Option = { value: string; label: string; active: boolean };
export type CatalogSelectorProps = {
  id: string; name?: string; label: string; value: string | null;
  onValueChange: (value: string | null) => void;
  disabled?: boolean; required?: boolean;
};

type SelectorState = {
  options: Option[]; pending: boolean; error: Error | null; retry: () => void;
  q: string; setQ: (value: string) => void; page: number; setPage: (page: number) => void;
  total: number;
};

function CatalogSelector({ kind, props, state }: { kind: CatalogKind; props: CatalogSelectorProps; state: SelectorState }) {
  const { id, name, label, value, onValueChange, disabled = false, required = false } = props;
  const { options, pending, error, retry, q, setQ, page, setPage, total } = state;
  const missing = !!value && !options.some((row) => row.value === value);
  const selection = useCatalogSelection(kind, value, missing);
  const items = missing ? [...options, selection.data ?? { value: value!, label: selection.isPending ? "Loading selection…" : "Unavailable selection", active: false }] : options;
  return <div className="space-y-3">
    <Label htmlFor={`${id}-search`}>Search {kind}</Label>
    <Input id={`${id}-search`} type="search" value={q} maxLength={100} disabled={disabled} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder={`Search ${kind}`} />
    <Label htmlFor={id}>{label}{required ? " *" : ""}</Label>
    <Select name={name} value={value} onValueChange={onValueChange} disabled={disabled || pending || !!error} required={required} items={items}>
      <SelectTrigger id={id} aria-describedby={`${id}-status`}><SelectValue placeholder={`Select ${kind === "crops" ? "a crop" : "a market"}`} /></SelectTrigger>
      <SelectContent>{items.map((row) => <SelectItem key={row.value} value={row.value} disabled={!row.active}>{row.label}</SelectItem>)}</SelectContent>
    </Select>
    <div id={`${id}-status`}>
      {pending ? <LoadingState label={`Loading ${kind}…`} className="min-h-16" /> : error ? <ErrorState title={`Could not load ${kind}`} description={error.message} onRetry={retry} /> : !options.length ? <p role="status" className="text-sm text-muted-foreground">No {kind} found. Try a different search.</p> : null}
      {missing && selection.isError && <ErrorState title="Selected item is unavailable" description="Choose another item or clear the selection." onRetry={() => { void selection.refetch(); }} />}
    </div>
    {!pending && !error && <CatalogPagination page={page} total={total} pageSize={20} onChange={setPage} />}
    {!required && value && <Button type="button" variant="ghost" disabled={disabled} onClick={() => onValueChange(null)}>Clear {label.toLowerCase()}</Button>}
  </div>;
}

/** Controlled, searchable single-value selector. Values are stable catalog IDs. */
export function CropSelector(props: CatalogSelectorProps) {
  const [q, setQ] = useState(""); const [page, setPage] = useState(1);
  const result = useCrops({ q, page, page_size: 20 });
  return <CatalogSelector kind="crops" props={props} state={{
    options: result.data?.items.map((row) => ({ value: row.id, label: `${row.name_en} · ${row.name_si} · ${row.name_ta}`, active: row.active })) ?? [],
    pending: result.isPending, error: result.error, retry: () => { void result.refetch(); },
    q, setQ, page, setPage, total: result.data?.total ?? 0,
  }} />;
}

/** Preserves and resolves the selected label across searches and result pages. */
export function MarketSelector(props: CatalogSelectorProps) {
  const [q, setQ] = useState(""); const [page, setPage] = useState(1);
  const result = useMarkets({ q, page, page_size: 20 });
  return <CatalogSelector kind="markets" props={props} state={{
    options: result.data?.items.map((row) => ({ value: row.id, label: row.name, active: row.active })) ?? [],
    pending: result.isPending, error: result.error, retry: () => { void result.refetch(); },
    q, setQ, page, setPage, total: result.data?.total ?? 0,
  }} />;
}
