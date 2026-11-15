"use client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { formatPrice, observationDate, priceTypeLabels, type Observation } from "../schema";

export function Source({ observation }: { observation: Observation }) {
  return <div className="max-w-xs space-y-1 text-xs"><p>{observation.source_url ? <a href={observation.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{observation.source_name}</a> : observation.source_name}</p>{observation.document_reference && <p className="break-words text-muted-foreground">{observation.document_reference}</p>}<p className="text-muted-foreground">Published {observation.source_publication_date}{!observation.source_published_at && " (time unknown)"}</p></div>;
}
export function FreshnessBadge({ value }: { value: Observation["freshness"] }) {
  return <Badge variant={value === "fresh" ? "secondary" : value === "stale" ? "destructive" : "outline"}>{value === "fresh" ? "Recent" : value === "stale" ? "Outdated" : "Not reported"}</Badge>;
}
export function PriceTable({ items, caption }: { items: Observation[]; caption: string }) {
  return <Table><TableCaption>{caption}</TableCaption><TableHeader><TableRow><TableHead>Crop / market</TableHead><TableHead>Type / quality</TableHead><TableHead>LKR/kg</TableHead><TableHead>Observed</TableHead><TableHead>Freshness</TableHead><TableHead>Source</TableHead></TableRow></TableHeader><TableBody>
    {items.map((row) => <TableRow key={row.id}><TableCell className="min-w-40 align-top"><p className="font-medium">{row.crop_name}</p><p className="text-xs text-muted-foreground">{row.market_name}</p></TableCell><TableCell className="align-top"><p>{priceTypeLabels[row.price_type]}</p><p className="text-xs text-muted-foreground">{row.quality || "Grade unspecified"}</p></TableCell><TableCell className="whitespace-nowrap align-top font-medium">{formatPrice(row.price_per_kg)}</TableCell><TableCell className="min-w-36 align-top text-xs">{observationDate(row)}</TableCell><TableCell className="align-top"><FreshnessBadge value={row.freshness} /></TableCell><TableCell className="min-w-56 align-top"><Source observation={row} /></TableCell></TableRow>)}
  </TableBody></Table>;
}
