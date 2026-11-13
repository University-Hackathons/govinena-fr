"use client";

import { ErrorState } from "@/components/states/error-state";

export default function WorkspaceError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <ErrorState
      description="This section encountered an unexpected problem. Please try again."
      onRetry={retry}
    />
  );
}
