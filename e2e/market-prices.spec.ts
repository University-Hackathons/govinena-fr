import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const samplePath = resolve(process.cwd(), "public/samples/verified_prices_sample.csv");
async function choose(page: Page, label: string, option: string | RegExp) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option }).click();
}
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
  if (new URL(page.url()).pathname === "/onboarding") {
    await page.getByLabel("Full name *", { exact: true }).fill("Price Test User");
    await choose(page, "District *", "Kandy");
    await page.getByLabel("Town or village *", { exact: true }).fill("Gampola");
    await page.getByRole("button", { name: "Skip optional fields", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }
}

test("admin imports verified history, replays safely, and views separated prices and audit", async ({ page }) => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
    "Requires a confirmed admin allowlisted in the backend, migrations and catalog seed.");
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!);
  await page.goto("/markets/prices");
  await page.getByRole("link", { name: "Import prices", exact: true }).click();
  await page.getByLabel("CSV file *", { exact: true }).setInputFiles(samplePath);
  await page.getByLabel("Verification note *", { exact: true }).fill("Verified CBSL report 30 December 2025 p2; Dambulla Yesterday and Today columns.");
  await page.getByRole("checkbox").click();
  const responsePromise = page.waitForResponse((response) => response.url().includes("/api/prices/imports?") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  const report = await (await responsePromise).json();
  expect(report.accepted).toBe(16);
  expect(report.rejected).toBe(0);
  await expect(page.getByRole("heading", { name: "Import results", exact: true })).toBeVisible();
  const download = await page.request.get(`/api/prices/imports/${report.id}/file`);
  expect(download.status()).toBe(200);
  expect(await download.body()).toEqual(readFileSync(samplePath));
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await expect(page.getByText("This exact file was imported before.", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Back to market prices", exact: true }).click();
  await choose(page, "Filter by crop", /^Tomato ·/);
  await choose(page, "Filter by market", "Dambulla Dedicated Economic Centre");
  const latest = page.getByRole("region", { name: "Latest observations", exact: true });
  await expect(latest.getByRole("cell", { name: /345\.00/ })).toBeVisible();
  await expect(latest.getByText("Outdated", { exact: true })).toBeVisible();
  await choose(page, "Price type", "Retail");
  await expect(latest.getByRole("cell", { name: /375\.00/ })).toBeVisible();
  await expect(latest.getByRole("cell", { name: /345\.00/ })).toHaveCount(0);
  await page.getByLabel("From date", { exact: true }).fill("2025-12-29");
  await page.getByLabel("To date", { exact: true }).fill("2025-12-30");
  await page.getByRole("button", { name: "Apply dates", exact: true }).click();
  const history = page.getByRole("region", { name: "Historical prices", exact: true });
  await expect(history.getByRole("cell", { name: /405\.00/ })).toBeVisible();
  await expect(history.getByText("Missing days and unreported prices break lines", { exact: false })).toBeVisible();
  await page.route("**/api/prices/latest?**", (route) => route.fulfill({ status: 503, json: { error: { message: "Test outage" } } }));
  await page.goto("/markets/prices");
  await expect(page.getByText("Latest prices unavailable", { exact: true })).toBeVisible();
  await page.unroute("**/api/prices/latest?**");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(latest.getByRole("table")).toBeVisible();
});

test("normal farmer cannot see import controls or submit a price import", async ({ page, baseURL }) => {
  test.skip(!process.env.E2E_FARMER_EMAIL || !process.env.E2E_FARMER_PASSWORD,
    "Requires a separate confirmed non-admin account.");
  await login(page, process.env.E2E_FARMER_EMAIL!, process.env.E2E_FARMER_PASSWORD!);
  await page.goto("/markets/prices");
  expect((await page.request.get("/api/prices/access")).status()).toBe(200);
  await expect(page.getByRole("link", { name: "Import prices", exact: true })).toHaveCount(0);
  const response = await page.request.post("/api/prices/imports?verified=true&verification_note=checked-source", {
    headers: { Origin: new URL(baseURL!).origin, "Content-Type": "text/csv" }, data: readFileSync(samplePath),
  });
  expect(response.status()).toBe(403);
});

test("anonymous price APIs reject access", async ({ request, baseURL }) => {
  for (const path of ["access", "latest", "freshness", "comparison?crop_id=tomato", "history?crop_id=tomato&market_id=dambulla-dec"])
    expect((await request.get(`/api/prices/${path}`)).status()).toBe(401);
  expect((await request.post("/api/prices/imports?verified=true&verification_note=checked-source", { headers: { Origin: new URL(baseURL!).origin, "Content-Type": "text/csv" }, data: readFileSync(samplePath) })).status()).toBe(401);
});
