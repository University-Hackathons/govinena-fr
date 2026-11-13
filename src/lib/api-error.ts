import axios from "axios";

export type ApiErrorKind =
  "configuration" | "timeout" | "network" | "http" | "unknown";

export class ApiError extends Error {
  readonly status?: number;
  readonly kind: ApiErrorKind;

  constructor(message: string, kind: ApiErrorKind, status?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }

  get retryable() {
    return (
      this.kind === "network" ||
      this.kind === "timeout" ||
      (this.kind === "http" && this.status !== undefined && this.status >= 500)
    );
  }
}

// Return safe user-facing text; never expose request headers or raw server bodies.
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiError(
        "The request timed out. Please try again.",
        "timeout",
      );
    }
    if (error.response) {
      const status = error.response.status;
      const message =
        status === 401
          ? "Please sign in to continue."
          : status === 403
            ? "You do not have access to this resource."
            : status === 404
              ? "The requested resource could not be found."
              : status === 429
                ? "Too many requests. Please try again later."
                : status >= 500
                  ? "The service is temporarily unavailable."
                  : "The request could not be completed. Please check your input.";
      return new ApiError(message, "http", status);
    }
    return new ApiError(
      "Unable to reach the service. Check your connection and try again.",
      "network",
    );
  }
  return new ApiError("Something went wrong. Please try again.", "unknown");
}
