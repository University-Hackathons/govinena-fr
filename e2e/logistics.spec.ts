import { test, expect, type Page } from "@playwright/test";
import { toSriLankaInput } from "../src/features/produce/schema";

async function choose(page: Page, label: string, option: string | RegExp) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option }).click();
}

test("mobile produce transportation fallback, capacity, return billing, quote and saved inputs", async ({ page, baseURL }) => {
  test.skip(!process.env.E2E_FARMER_EMAIL || !process.env.E2E_FARMER_PASSWORD,
    "Requires a confirmed disposable farmer account, migrated database and catalog seed.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_FARMER_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_FARMER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
  if (new URL(page.url()).pathname === "/onboarding") {
    await page.getByLabel("Full name *", { exact: true }).fill("Logistics Test Farmer");
    await choose(page, "District *", "Kandy");
    await page.getByLabel("Town or village *", { exact: true }).fill("Gampola");
    await page.getByRole("button", { name: "Skip optional fields", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }
  await page.goto("/produce/new");
  await choose(page, "Crop *", /^Tomato ·/);
  await page.getByLabel("Quantity in kg *", { exact: true }).fill("100");
  await page.getByLabel("Harvest date and time *", { exact: true }).fill(toSriLankaInput(new Date(Date.now() - 3600000).toISOString()));
  await page.getByLabel("Latest acceptable sale date and time *", { exact: true }).fill(toSriLankaInput(new Date(Date.now() + 86400000).toISOString()));
  await page.getByRole("button", { name: "Add produce batch", exact: true }).click();
  await expect(page).toHaveURL(/\/produce\/[0-9a-f-]+$/);
  await choose(page, "Destination market *", "Dambulla Dedicated Economic Centre");
  await page.getByLabel("Vehicle capacity in kg *", { exact: true }).fill("40");
  await page.getByLabel("Rate per kilometer (LKR)", { exact: true }).fill("20");
  await page.getByLabel("Base vehicle charge per delivery (LKR)", { exact: true }).fill("300");
  await choose(page, "Distance source", "Use my known distance");
  await page.getByRole("button", { name: "Estimate transportation", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("exceeds vehicle capacity");
  await page.getByRole("checkbox", { name: "Allow multiple deliveries when this batch exceeds vehicle capacity" }).click();
  await page.getByRole("button", { name: "Estimate transportation", exact: true }).click();
  await expect(page.getByText("More input needed", { exact: true })).toBeVisible();
  await expect(page.getByText("Not calculated", { exact: true })).toBeVisible();
  await page.getByLabel("Known outbound distance in km (optional)", { exact: true }).fill("10");
  await choose(page, "Distance source", "Use my known distance");
  await choose(page, "Vehicle distance pricing", "Charged for outbound and return distance");
  await page.getByLabel("Known return distance in km (optional)", { exact: true }).fill("15");
  await page.getByRole("button", { name: "Estimate transportation", exact: true }).click();
  const result = page.getByRole("region", { name: "Transportation estimate", exact: true });
  await expect(result.getByText("Manual distance · user input", { exact: true })).toBeVisible();
  await expect(result.getByText(/2,400\.00/).last()).toBeVisible();
  await page.getByLabel("Known whole-batch quote (LKR, optional)", { exact: true }).fill("700");
  await page.getByLabel("Quote description", { exact: true }).fill("All-in quote for all three deliveries");
  await page.getByRole("button", { name: "Estimate transportation", exact: true }).click();
  await expect(result.getByText("Known whole-batch quote · user input", { exact: true })).toBeVisible();
  await expect(result.getByText(/700\.00/)).toBeVisible();
  await page.reload();
  const history = page.getByRole("region", { name: "Recorded transportation assumptions", exact: true });
  await expect(history.getByText(/Dambulla Dedicated Economic Centre/).first()).toBeVisible();
  await history.locator("summary").first().click();
  await expect(history.getByText("All-in quote for all three deliveries", { exact: true })).toBeVisible();
  const batchId = new URL(page.url()).pathname.split("/").pop()!;
  expect((await page.request.delete(`/api/produce/${batchId}`, { headers: { Origin: new URL(baseURL!).origin } })).status()).toBe(204);
  await page.reload();
  await expect(page.getByRole("button", { name: "Estimate transportation", exact: true })).toHaveCount(0);
  await expect(history.locator("summary").first()).toBeVisible();
});

test("anonymous logistics API access and cross-origin writes are rejected", async ({ request, baseURL }) => {
  const id = "00000000-0000-4000-8000-000000000001";
  const body = { produce_batch_id: id, market_id: "dambulla-dec" };
  expect((await request.get(`/api/logistics/estimates?batch_id=${id}`)).status()).toBe(401);
  expect((await request.post("/api/logistics/estimate", { headers: { Origin: new URL(baseURL!).origin }, data: body })).status()).toBe(401);
  expect((await request.post("/api/logistics/estimate", { headers: { Origin: "https://untrusted.example" }, data: body })).status()).toBe(403);
});
