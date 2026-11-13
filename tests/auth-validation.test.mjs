import test from "node:test";
import assert from "node:assert/strict";
import { validateAuth, providerMessage } from "../src/features/auth/validation.ts";

test("registration validates email, password length, and confirmation", () => {
  assert.equal(validateAuth("register", { email: "farmer@example.com", password: "example-pass", confirmPassword: "example-pass" }).success, true);
  for (const values of [
    {},
    { email: "invalid", password: "example-pass", confirmPassword: "example-pass" },
    { email: "farmer@example.com", password: "short", confirmPassword: "short" },
    { email: "farmer@example.com", password: "example-pass", confirmPassword: "different" },
    { email: "farmer@example.com", password: "x".repeat(129), confirmPassword: "x".repeat(129) },
  ]) assert.equal(validateAuth("register", values).success, false);
});

test("login accepts existing short passwords but rejects empty credentials", () => {
  assert.equal(validateAuth("login", { email: "farmer@example.com", password: "legacy" }).success, true);
  assert.equal(validateAuth("login", { email: "farmer@example.com", password: "" }).success, false);
});

test("recovery validates email and reset requires matching passwords", () => {
  assert.equal(validateAuth("forgot-password", { email: "farmer@example.com" }).success, true);
  assert.equal(validateAuth("forgot-password", { email: "" }).success, false);
  assert.equal(validateAuth("reset-password", { password: "new-password", confirmPassword: "new-password" }).success, true);
  assert.equal(validateAuth("reset-password", { password: "new-password", confirmPassword: "other" }).success, false);
});

test("provider failures have safe actionable messages", () => {
  assert.match(providerMessage("invalid_credentials"), /incorrect/);
  assert.match(providerMessage("user_already_exists"), /already registered/);
  assert.match(providerMessage("email_not_confirmed"), /Confirm your email/);
  assert.match(providerMessage("over_email_send_rate_limit"), /Too many/);
  assert.match(providerMessage("private-internal-provider-error"), /try again/);
  assert.doesNotMatch(providerMessage("private-internal-provider-error"), /private-internal/);
});
