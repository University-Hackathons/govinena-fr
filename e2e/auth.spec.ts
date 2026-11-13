import { test, expect } from "@playwright/test";
test("anonymous visitors cannot open workspace pages or the profile API", async ({ page, request }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    const profile = await request.get("/api/users/me");
    expect(profile.status()).toBe(401);
});
test("login, refresh, guest redirects, and logout", async ({ page, context }) => {
    test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Configure a confirmed disposable test user.");
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_EMAIL!);
    await page.getByLabel("Password", { exact: true }).fill("incorrect-password-for-test");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("incorrect");
    await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
    const profile = await page.request.get("/api/users/me");
    expect(profile.status()).toBe(200);
    expect((await profile.json()).email).toBe(process.env.E2E_EMAIL);
    const cookies = (await context.cookies()).filter((cookie) => cookie.name.includes("auth-token"));
    expect(cookies.length).toBeGreaterThan(0);
    expect(cookies.every((cookie) => cookie.httpOnly && cookie.sameSite === "Lax")).toBe(true);
    expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => /supabase|auth-token/i.test(key)))).toEqual([]);
    await page.reload();
    await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
    await page.goto("/register");
    await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
    await page.getByRole("button").filter({ hasText: process.env.E2E_EMAIL! }).click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect((await page.request.get("/api/users/me")).status()).toBe(401);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
});
test("registration returns an email confirmation result", async ({ page }) => {
    test.skip(!process.env.E2E_SIGNUP_EMAIL || !process.env.E2E_SIGNUP_PASSWORD, "Set a fresh disposable signup email and strong password; this sends a real confirmation email.");
    await page.goto("/register");
    await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_SIGNUP_EMAIL!);
    await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_SIGNUP_PASSWORD!);
    await page.getByLabel("Confirm password", { exact: true }).fill(process.env.E2E_SIGNUP_PASSWORD!);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("inbox");
});

test("duplicate confirmed email registration has a clear result", async ({ page }) => {
    test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Configure a confirmed disposable test user.");
    await page.goto("/register");
    await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_EMAIL!);
    await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_PASSWORD!);
    await page.getByLabel("Confirm password", { exact: true }).fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page.getByRole("status").or(page.getByRole("alert"))).toContainText(/inbox|already registered/);
});
