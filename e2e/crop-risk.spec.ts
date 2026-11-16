import { test, expect, type Page } from "@playwright/test";
import { toSriLankaInput } from "../src/features/produce/schema";

async function choose(page: Page, label: string, option: string | RegExp) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option }).click();
}
test("mobile crop urgency, storage, arrival rejection, refresh and service failure", async ({ page, baseURL }) => {
  test.skip(!process.env.E2E_FARMER_EMAIL || !process.env.E2E_FARMER_PASSWORD, "Requires a disposable confirmed farmer account and a migrated, seeded backend.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_FARMER_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_FARMER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
  if (new URL(page.url()).pathname === "/onboarding") {
    await page.getByLabel("Full name *", { exact: true }).fill("Crop Risk Test Farmer");
    await choose(page, "District *", "Kandy");
    await page.getByLabel("Town or village *", { exact: true }).fill("Gampola");
    await page.getByRole("button", { name: "Skip optional fields", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }
  await page.goto("/produce/new");
  await choose(page, "Crop *", /^Tomato ·/);
  await page.getByLabel("Quantity in kg *", { exact: true }).fill("100");
  await page.getByLabel("Harvest date and time *", { exact: true }).fill(toSriLankaInput(new Date(Date.now() - 3600000).toISOString()));
  const deadline = Date.now() + 86400000;
  await page.getByLabel("Latest acceptable sale date and time *", { exact: true }).fill(toSriLankaInput(new Date(deadline).toISOString()));
  await page.getByRole("button", { name: "Add produce batch", exact: true }).click();
  await expect(page).toHaveURL(/\/produce\/[0-9a-f-]+$/);
  const result = page.getByRole("region", { name: "Selling urgency assessment", exact: true });
  await expect(result.getByText(/remaining$/).first()).toBeVisible();
  await expect(result.getByText("Your deadline · farmer input", { exact: true })).toBeVisible();
  await choose(page, "Known storage conditions", "Shaded storage");
  await page.getByLabel("Expected arrival (optional, Sri Lanka time)").fill(toSriLankaInput(new Date(deadline + 3600000).toISOString()));
  await page.getByRole("button", { name: "Update urgency assessment", exact: true }).click();
  await expect(result.getByText("High urgency", { exact: true })).toBeVisible();
  await expect(result.getByRole("alert")).toContainText("arrival is at or after");
  await expect(result.getByText("Not estimated for a rejected alternative", { exact: true })).toBeVisible();
  await page.reload();
  await expect(result.getByText("Deadline open", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Expected arrival (optional, Sri Lanka time)")).toHaveValue("");
  await page.route("**/api/crop-risk/evaluate", (route) => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.getByRole("button", { name: "Update urgency assessment", exact: true }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await page.unroute("**/api/crop-risk/evaluate");
  const batchID = new URL(page.url()).pathname.split("/").pop()!;
  expect((await page.request.delete(`/api/produce/${batchID}`, { headers: { Origin: new URL(baseURL!).origin } })).status()).toBe(204);
});

test("crop-risk API rejects anonymous and cross-origin writes", async ({ request, baseURL }) => {
  const body = { produce_batch_id: "00000000-0000-4000-8000-000000000001" };
  expect((await request.post("/api/crop-risk/evaluate", { headers: { Origin: new URL(baseURL!).origin }, data: body })).status()).toBe(401);
  expect((await request.post("/api/crop-risk/evaluate", { headers: { Origin: "https://untrusted.example" }, data: body })).status()).toBe(403);
});
