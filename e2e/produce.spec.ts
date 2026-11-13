import { test, expect, type Page } from "@playwright/test";
import { toSriLankaInput } from "../src/features/produce/schema";

async function choose(page: Page, label: string, option: string | RegExp) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option }).click();
}

test("mobile produce create, validation, edit, refresh, search, outage, and archive", async ({ page }) => {
  test.skip(!process.env.E2E_FARMER_EMAIL || !process.env.E2E_FARMER_PASSWORD,
    "Requires a confirmed disposable account and migrated/seeded backend.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_FARMER_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_FARMER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
  if (new URL(page.url()).pathname === "/onboarding") {
    await page.getByLabel("Full name *", { exact: true }).fill("Produce Test Farmer");
    await choose(page, "District *", "Kandy");
    await page.getByLabel("Town or village *", { exact: true }).fill("Gampola");
    await page.getByRole("button", { name: "Skip optional fields", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }
  await page.goto("/produce");
  await page.getByRole("link", { name: "Add produce", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Add produce", exact: true })).toBeVisible();
  await expect(page.getByLabel("Source town or village *", { exact: true })).not.toHaveValue("");
  await choose(page, "Crop *", /^Tomato ·/);
  await page.getByLabel("Quantity in kg *", { exact: true }).fill("-1");
  await page.getByLabel("Harvest date and time *", { exact: true }).fill(toSriLankaInput(new Date(Date.now() - 7200000).toISOString()));
  await page.getByLabel("Latest acceptable sale date and time *", { exact: true }).fill(toSriLankaInput(new Date(Date.now() + 86400000).toISOString()));
  await page.getByRole("button", { name: "Add produce batch", exact: true }).click();
  await expect(page.locator("#quantity_kg-error")).toBeVisible();
  await page.getByLabel("Quantity in kg *", { exact: true }).fill("125.125");
  const note = `produce-e2e-${Date.now()}`;
  await page.getByLabel("Batch notes (optional)", { exact: true }).fill(note);
  await page.getByRole("button", { name: "Add produce batch", exact: true }).click();
  await expect(page).toHaveURL(/\/produce\/[0-9a-f-]+$/);
  const batchURL = page.url();
  const batchID = new URL(batchURL).pathname.split("/").pop()!;
  await expect(page.getByRole("heading", { name: "Tomato batch", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("125.125 kg", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Edit produce", exact: true }).click();
  await expect(page.getByLabel("Quantity in kg *", { exact: true })).toHaveValue("125.125");
  await page.getByLabel("Quantity in kg *", { exact: true }).fill("80.5");
  await choose(page, "Status *", "Reserved");
  await page.route("**/api/produce/*", (route) => route.request().method() === "PATCH"
    ? route.fulfill({ status: 503, json: { error: { message: "Test outage" } } }) : route.continue());
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("unavailable");
  await expect(page.getByLabel("Quantity in kg *", { exact: true })).toHaveValue("80.5");
  await page.unroute("**/api/produce/*");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page).toHaveURL(batchURL);
  await page.reload();
  await expect(page.getByText("80.5 kg", { exact: true })).toBeVisible();
  await expect(page.getByText("Reserved", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Find a market — coming later" })).toBeDisabled();
  await page.getByRole("link", { name: "Back to produce", exact: true }).click();
  await page.getByLabel("Search produce", { exact: true }).fill(note);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await choose(page, "Batch status", "Reserved");
  await expect(page.getByRole("link", { name: `View Tomato batch ${batchID}`, exact: true })).toBeVisible();
  await choose(page, "Batch status", "Sold");
  await expect(page.getByRole("heading", { name: "No matching produce" })).toBeVisible();
  await page.goto(batchURL);
  await page.getByRole("button", { name: "Archive batch", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Archive batch", exact: true }).click();
  await expect(page.getByText("This batch is archived and read-only. Its record is retained.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "Edit produce", exact: true })).toHaveCount(0);
  await page.goto("/produce");
  await choose(page, "Batch status", "Archived");
  await page.getByLabel("Search produce", { exact: true }).fill(note);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("link", { name: `View Tomato batch ${batchID}`, exact: true })).toBeVisible();
});

test("anonymous reads and writes fail; mutation requests require same origin", async ({ request, baseURL }) => {
  const id = "00000000-0000-4000-8000-000000000001";
  for (const path of ["", `/${id}`]) expect((await request.get(`/api/produce${path}`)).status()).toBe(401);
  const headers = { Origin: new URL(baseURL!).origin };
  expect((await request.post("/api/produce", { headers, data: {} })).status()).toBe(401);
  expect((await request.patch(`/api/produce/${id}`, { headers, data: {} })).status()).toBe(401);
  expect((await request.delete(`/api/produce/${id}`, { headers })).status()).toBe(401);
  expect((await request.post("/api/produce", { headers: { Origin: "https://untrusted.example" }, data: {} })).status()).toBe(403);
});
