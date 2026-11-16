import { test, expect, type Page } from "@playwright/test";
import { toSriLankaInput } from "../src/features/produce/schema";
async function choose(page: Page, label: string, value: string | RegExp) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: value, exact: typeof value === "string" }).click();
}

test("mobile market ranking, quote overrides, saved snapshot and excluded deadline", async ({ page, baseURL }) => {
  test.skip(!process.env.E2E_FARMER_EMAIL || !process.env.E2E_FARMER_PASSWORD || process.env.E2E_COMPARISON_FRESH_PRICES !== "1", "Requires a disposable confirmed farmer, migrated test database, catalog and fresh verified ungraded wholesale tomato prices at Dambulla and Meegoda. Set E2E_COMPARISON_FRESH_PRICES=1 after preparing these.");
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_FARMER_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_FARMER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
  if (new URL(page.url()).pathname === "/onboarding") {
    await page.getByLabel("Full name *", { exact: true }).fill("Comparison Test Farmer");
    await choose(page, "District *", "Kandy");
    await page.getByLabel("Town or village *", { exact: true }).fill("Gampola");
    await page.getByRole("button", { name: "Skip optional fields", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }
  await page.goto("/produce/new");
  await choose(page, "Crop *", /^Tomato ·/);
  await page.getByLabel("Quantity in kg *", { exact: true }).fill("100");
  await page.getByLabel("Harvest date and time *", { exact: true }).fill(toSriLankaInput(new Date(Date.now()-3600000).toISOString()));
  const deadline = Date.now()+86400000;
  await page.getByLabel("Latest acceptable sale date and time *", { exact: true }).fill(toSriLankaInput(new Date(deadline).toISOString()));
  await page.getByRole("button", { name: "Add produce batch", exact: true }).click();
  await expect(page).toHaveURL(/\/produce\/[0-9a-f-]+$/);
  const form = page.getByRole("form", { name: "Market comparison settings" });
  await form.getByRole("checkbox", { name: "Explicitly assume no quantity loss for this scenario" }).click();
  await page.getByLabel("Comparison vehicle capacity (kg)", { exact: true }).fill("1000");
  await choose(page, "Candidate market 1 *", "Dambulla Dedicated Economic Centre");
  await form.getByRole("button", { name: "Add candidate market", exact: true }).click();
  await choose(page, "Candidate market 2 *", "Meegoda Dedicated Economic Centre");
  for (const [index, quote] of [[1, "700"], [2, "500"]] as const) {
    await page.getByLabel(`Known outbound distance (km) · market ${index}`, { exact: true }).fill("10");
    await page.getByLabel(`Known outbound duration (minutes) · market ${index}`, { exact: true }).fill("60");
    await page.getByLabel(`Whole-batch transport quote (LKR) · market ${index}`, { exact: true }).fill(quote);
    await page.getByLabel(`Quote description · market ${index}`, { exact: true }).fill("Test whole-batch all-deliveries quote");
  }
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/comparisons") && response.request().method() === "POST");
  await form.getByRole("button", { name: "Compare Markets", exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.eligible).toHaveLength(2);
  expect(Number(data.eligible[0].expected_net_proceeds_lkr)).toBeGreaterThanOrEqual(Number(data.eligible[1].expected_net_proceeds_lkr));
  const results = page.getByRole("region", { name: "Market comparison results", exact: true });
  await expect(results.getByText(/#1 ·/)).toBeVisible();
  await results.locator("summary", { hasText: "Transport and cost breakdown" }).first().click();
  await expect(results.getByText(/Known whole-batch quote/).first()).toBeVisible();
  await expect(page).toHaveURL(/comparison=/);
  await page.reload();
  await expect(results.getByText(/#1 ·/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // Re-enter one candidate and force final arrival after the saved deadline.
  await choose(page, "Candidate market 1 *", "Dambulla Dedicated Economic Centre");
  await page.getByLabel("Comparison vehicle capacity (kg)", { exact: true }).fill("1000");
  await page.getByLabel("Whole-batch transport quote (LKR) · market 1", { exact: true }).fill("700");
  await page.getByLabel("Quote description · market 1", { exact: true }).fill("All-in quote");
  await page.getByLabel("Expected final arrival (Sri Lanka time) · market 1", { exact: true }).fill(toSriLankaInput(new Date(deadline+3600000).toISOString()));
  await form.getByRole("button", { name: "Compare Markets", exact: true }).click();
  await expect(results.getByRole("heading", { name: "No eligible markets", exact: true })).toBeVisible();
  await expect(results.getByText("Arrival is at or after the farmer's hard selling deadline.", { exact: true })).toBeVisible();
  await page.route("**/api/comparisons", (route) => route.fulfill({ status: 503, json: {} }));
  await form.getByRole("button", { name: "Compare Markets", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("could not be completed");
  await page.unroute("**/api/comparisons");
  const id = new URL(page.url()).pathname.split("/").pop()!;
  expect((await page.request.delete(`/api/produce/${id}`, { headers: { Origin: new URL(baseURL!).origin } })).status()).toBe(204);
});

test("comparison endpoints protect sessions and same-origin writes", async ({ request, baseURL }) => {
  const id = "00000000-0000-4000-8000-000000000001";
  expect((await request.post("/api/comparisons", { headers: { Origin: new URL(baseURL!).origin }, data: { produce_batch_id: id } })).status()).toBe(401);
  expect((await request.post("/api/comparisons", { headers: { Origin: "https://untrusted.example" }, data: { produce_batch_id: id } })).status()).toBe(403);
  expect((await request.get(`/api/comparisons/${id}`)).status()).toBe(401);
});
