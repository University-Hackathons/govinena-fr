"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function CatalogFilter({ id, label, value, options, allLabel, onChange }: {
  id: string; label: string; allLabel: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void;
}) {
  const items = [{ value: "all", label: allLabel }, ...options];
  return <Select value={value || "all"} onValueChange={(next) => onChange(!next || next === "all" ? "" : next)} items={items}>
    <SelectTrigger id={id} aria-label={label}><SelectValue /></SelectTrigger>
    <SelectContent>{items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
  </Select>;
}

export function CatalogPagination({ page, total, pageSize, busy = false, onChange }: {
  page: number; total: number; pageSize: number; busy?: boolean; onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <nav aria-label="Result pages" className="flex flex-wrap items-center justify-between gap-3">
    <p role="status" className="text-sm text-muted-foreground">{total} {total === 1 ? "result" : "results"} · Page {page} of {pages}</p>
    <div className="flex gap-2">
      <Button type="button" variant="outline" disabled={busy || page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
      <Button type="button" variant="outline" disabled={busy || page >= pages} onClick={() => onChange(page + 1)}>Next</Button>
    </div>
  </nav>;
}
