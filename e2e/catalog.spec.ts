import { test, expect, type Page } from "@playwright/test";

async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("authenticated directory search, filters, market detail, empty and service error states", async ({ page }) => {
  test.skip(!process.env.E2E_FARMER_EMAIL || !process.env.E2E_FARMER_PASSWORD,
    "Requires a confirmed disposable account and migrated/seeded backend.");
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_FARMER_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_FARMER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
  if (new URL(page.url()).pathname === "/onboarding") {
    await page.getByLabel("Full name *", { exact: true }).fill("Catalog Test Farmer");
    await choose(page, "District *", "Kandy");
    await page.getByLabel("Town or village *", { exact: true }).fill("Kandy");
    await page.getByRole("button", { name: "Skip optional fields", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }
  await page.goto("/markets");
  const markets = page.getByRole("region", { name: "Wholesale market directory" });
  const crops = page.getByRole("region", { name: "Crop catalog" });
  await expect(markets.getByRole("link", { name: "Dambulla Dedicated Economic Centre", exact: true })).toBeVisible();
  await choose(page, "Market district", "Matale");
  await expect(markets.getByText("1 result · Page 1 of 1")).toBeVisible();
  await markets.getByRole("link", { name: "View Dambulla Dedicated Economic Centre", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dambulla Dedicated Economic Centre" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sources and verification" })).toBeVisible();
  await expect(page.getByText("Exact coordinates have not been verified.", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dambulla Dedicated Economic Centre" })).toBeVisible();
  await page.getByRole("link", { name: "Back to markets" }).click();
  await page.getByLabel("Search markets", { exact: true }).fill("no-such-market");
  await markets.getByRole("button", { name: "Search", exact: true }).click();
  await expect(markets.getByRole("heading", { name: "No markets found" })).toBeVisible();
  await choose(page, "Crop category", "Root vegetables");
  await expect(crops.getByText("Carrot", { exact: true })).toBeVisible();
  await expect(crops.getByText("Tomato", { exact: true })).toHaveCount(0);
  await choose(page, "Crop category", "All categories");
  await page.getByLabel("Search crops", { exact: true }).fill("தக்காளி");
  await crops.getByRole("button", { name: "Search", exact: true }).click();
  await expect(crops.getByText("Tomato", { exact: true })).toBeVisible();
  await expect(crops.getByText("Brinjal", { exact: true })).toHaveCount(0);
  await page.goto("/markets/no-such-market");
  await expect(page.getByRole("heading", { name: "Market not found" })).toBeVisible();
  await page.route("**/api/catalog/markets?**", (route) => route.fulfill({ status: 503, json: { error: { message: "Test outage" } } }));
  await page.goto("/markets");
  await expect(page.getByText("Markets are unavailable", { exact: true })).toBeVisible();
  await page.unroute("**/api/catalog/markets?**");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(markets.getByRole("link", { name: "Dambulla Dedicated Economic Centre", exact: true })).toBeVisible();
});

test("anonymous catalog API calls are rejected", async ({ request }) => {
  for (const path of ["crops", "markets", "crops/tomato", "markets/dambulla-dec"]) {
    expect((await request.get(`/api/catalog/${path}`)).status()).toBe(401);
  }
  expect((await request.post("/api/catalog/markets", { data: {} })).status()).toBe(405);
});
