import Link from "next/link";
import { EmptyState } from "@/components/states/empty-state";
export default function NotFound() {
  return <EmptyState title="Market not found" description="This market is not in the reference directory." action={<Link href="/markets" className="underline">Back to markets</Link>} />;
}
