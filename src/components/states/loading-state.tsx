import Loader from "@/components/Loader";
import { cn } from "@/lib/utils";

export function LoadingState({
  label = "Loading workspace…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-40 flex-col items-center justify-center gap-3 p-6", className)}>
      <Loader label={label} />
      <p aria-hidden="true" className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
