import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-error";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          failureCount < 1 && (!(error instanceof ApiError) || error.retryable),
      },
      mutations: { retry: false },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  // Never share query caches between server requests. Keep the browser client
  // stable even when React suspends during the first render.
  if (typeof window === "undefined") return makeQueryClient();
  return (browserQueryClient ??= makeQueryClient());
}
