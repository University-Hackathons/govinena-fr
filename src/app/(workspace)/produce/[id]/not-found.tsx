import Link from "next/link";
import { EmptyState } from "@/components/states/empty-state";
export default function NotFound() { return <EmptyState title="Produce batch not found" description="This batch is unavailable or does not belong to your account." action={<Link href="/produce" className="underline">Back to produce</Link>} />; }
