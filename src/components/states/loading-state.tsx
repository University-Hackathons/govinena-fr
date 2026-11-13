import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({
  label = "Loading workspace…",
}: {
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-9 w-52" />
      <Skeleton className="h-5 w-full max-w-md" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
