import axios from "axios";
import { z } from "zod";
import { publicEnv } from "@/config/env";
import { ApiError, toApiError } from "@/lib/api-error";

const baseUrlSchema = z.url().refine((value) => /^https?:\/\//i.test(value), {
  message: "Use an HTTP or HTTPS URL.",
});

export const api = axios.create({
  baseURL: publicEnv.apiBaseUrl,
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

// Validate only when a request is made, so previews work even without an API URL.
api.interceptors.request.use((config) => {
  const result = baseUrlSchema.safeParse(publicEnv.apiBaseUrl);
  if (!result.success) {
    throw new ApiError(
      "The API base URL has not been configured correctly.",
      "configuration",
    );
  }
  config.baseURL = result.data;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) =>
    Promise.reject(axios.isCancel(error) ? error : toApiError(error)),
);

// Future services should pass an AbortSignal for query cancellation.
// Do not add secret keys, tokens, or credentials to NEXT_PUBLIC_ variables.
