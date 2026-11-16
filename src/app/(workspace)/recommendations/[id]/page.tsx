import { Suspense } from "react";
import { RunDetail } from "@/features/recommendations/components/run-detail";
import { LoadingState } from "@/components/states/loading-state";
export const metadata = { title: "Market recommendation" };
async function Detail({ params }: { params: Promise<{ id: string }> }) { return <RunDetail id={(await params).id} />; }
export default function Page({ params }: { params: Promise<{ id: string }> }) { return <Suspense fallback={<LoadingState label="Loading recommendation…" />}><Detail params={params} /></Suspense>; }
