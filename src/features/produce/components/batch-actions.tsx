"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { archiveProduce } from "../api";

export function BatchActions({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter(); const queries = useQueryClient();
  if (archived) return <p className="text-sm text-muted-foreground">This batch is archived and read-only. Its record is retained.</p>;
  return <div className="flex flex-wrap gap-3">
    <Button asChild variant="outline"><Link href={`/produce/${id}/edit`}>Edit produce</Link></Button>
    <ConfirmAction title="Archive this batch?" description="The batch will leave your current produce list. Its details are retained, and archived batches cannot be edited." confirmLabel="Archive batch" onConfirm={async () => {
      try {
        await archiveProduce(id); await queries.invalidateQueries({ queryKey: ["produce"] });
        toast.success("Produce batch archived."); router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "The batch could not be archived."); return false; }
    }}><Button type="button" variant="destructive">Archive batch</Button></ConfirmAction>
  </div>;
}
