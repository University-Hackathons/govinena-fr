import test from "node:test";
import assert from "node:assert/strict";
import { AxiosError } from "axios";
import { ApiError, toApiError } from "../src/lib/api-error.ts";

test("configuration failures retain their type and are not retried", () => {
  const error = new ApiError("Missing URL", "configuration");
  assert.equal(toApiError(error), error);
  assert.equal(error.retryable, false);
});

test("timeouts and unreachable services allow a bounded retry", () => {
  for (const code of ["ECONNABORTED", "ETIMEDOUT", "ERR_NETWORK"]) {
    const error = toApiError(new AxiosError("Internal request details", code));
    assert.equal(error.kind, code === "ERR_NETWORK" ? "network" : "timeout");
    assert.equal(error.retryable, true);
    assert.doesNotMatch(error.message, /Internal request details/);
  }
});

test("HTTP errors preserve status without exposing credentials or backend details", () => {
  for (const status of [400, 401, 403, 404, 429, 500, 503]) {
    const response = {
      status,
      statusText: "",
      data: { message: "private backend details" },
      headers: {},
      config: {},
    };
    const error = toApiError(
      new AxiosError(
        "secret-token",
        "ERR_BAD_RESPONSE",
        undefined,
        undefined,
        response,
      ),
    );
    assert.equal(error.status, status);
    assert.equal(error.kind, "http");
    assert.equal(error.retryable, status >= 500);
    assert.doesNotMatch(error.message, /secret-token|private backend details/);
  }
});

test("unknown failures have safe messages and are not retried", () => {
  const error = toApiError(new Error("sensitive internal error"));
  assert.equal(error.kind, "unknown");
  assert.equal(error.retryable, false);
  assert.doesNotMatch(error.message, /sensitive/);
});
