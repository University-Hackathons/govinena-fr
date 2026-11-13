import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/states/empty-state";

export function FeaturePlaceholder({
  title,
  description,
  emptyTitle,
}: {
  title: string;
  description: string;
  emptyTitle: string;
}) {
  return (
    <>
      <div className="space-y-3">
        <Badge variant="secondary">Placeholder · Not connected</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-2xl leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
      <Alert>
        <Info className="size-4" aria-hidden="true" />
        <AlertTitle>A space for what comes next</AlertTitle>
        <AlertDescription>
          This page is a preview. No live information is loaded and no changes
          are saved.
        </AlertDescription>
      </Alert>
      <EmptyState
        title={emptyTitle}
        description="This section will be implemented in a future release. For now, you can explore the preview workspace and switch between light and dark themes."
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to dashboard
            </Link>
          </Button>
        }
      />
    </>
  );
}
