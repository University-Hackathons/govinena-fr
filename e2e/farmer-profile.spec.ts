import { test, expect, type Page } from "@playwright/test";

async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

// Use a dedicated disposable account. No tokens or credentials are recorded.
test("farmer onboarding, validation, service failure, edit, and reload persistence", async ({ page }) => {
  test.skip(!process.env.E2E_FARMER_EMAIL || !process.env.E2E_FARMER_PASSWORD,
    "Set E2E_FARMER_EMAIL and E2E_FARMER_PASSWORD for a confirmed disposable account.");
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_FARMER_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_FARMER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
  const existing = await page.request.get("/api/farmer/profile");
  if (existing.status() === 404) {
    await expect(page).toHaveURL(/\/onboarding$/);
    await page.getByLabel("Full name *", { exact: true }).fill("E2E Farmer");
    await choose(page, "District *", "Kandy");
    await page.getByLabel("Town or village *", { exact: true }).fill("Gampola");
    await page.getByRole("button", { name: "Skip optional fields", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  } else {
    expect(existing.status()).toBe(200);
  }

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Farmer profile", exact: true })).toBeVisible();
  await page.getByLabel("Full name *", { exact: true }).fill("E2E Updated Farmer");
  await choose(page, "District *", "Kandy");
  await page.getByLabel("Town or village *", { exact: true }).fill("Peradeniya");
  await choose(page, "Default transport mode *", "Hired vehicle");
  await choose(page, "Preferred language *", "සිංහල (Sinhala)");
  await page.getByLabel("Estimated transport rate in LKR/km (optional)", { exact: true }).fill("-10");
  await page.getByLabel("Vehicle capacity in kg (optional)", { exact: true }).fill("-1");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.locator("#estimated_transport_rate-error")).toBeVisible();
  await expect(page.locator("#vehicle_capacity_kg-error")).toBeVisible();
  await page.getByLabel("Estimated transport rate in LKR/km (optional)", { exact: true }).fill("80.50");
  await page.getByLabel("Vehicle capacity in kg (optional)", { exact: true }).fill("250");
  await page.getByLabel("Contact number (optional)", { exact: true }).fill("");
  await expect(page.getByLabel("Approximate latitude (optional)", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Approximate longitude (optional)", { exact: true })).toHaveCount(0);
  if (await page.getByRole("button", { name: "Remove location", exact: true }).count()) {
    await page.getByRole("button", { name: "Remove location", exact: true }).click();
  }
  await expect(page.getByText("No location selected.", { exact: true })).toBeVisible();
  await page.getByLabel("Preferred market IDs (optional)", { exact: true }).fill("");

  await page.route("**/api/farmer/profile", async (route) => {
    if (route.request().method() === "PUT") await route.fulfill({ status: 503, json: { error: { message: "Test service unavailable" } } });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.locator("[data-sonner-toast][data-type=error]").last()).toContainText("could not be saved");
  await expect(page.getByLabel("Full name *", { exact: true })).toHaveValue("E2E Updated Farmer");
  await page.unroute("**/api/farmer/profile");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.locator("[data-sonner-toast][data-type=success]").filter({ hasText: "Your farmer profile has been saved." }).last()).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Full name *", { exact: true })).toHaveValue("E2E Updated Farmer");
  await expect(page.getByLabel("Town or village *", { exact: true })).toHaveValue("Peradeniya");
  await expect(page.getByLabel("Vehicle capacity in kg (optional)", { exact: true })).toHaveValue("250");
  await expect(page.getByLabel("Estimated transport rate in LKR/km (optional)", { exact: true })).toHaveValue("80.5");
  await expect(page.getByText("Required details complete", { exact: true })).toBeVisible();
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("anonymous users cannot read or update a farmer profile", async ({ request, baseURL }) => {
  expect((await request.get("/api/farmer/profile")).status()).toBe(401);
  const response = await request.put("/api/farmer/profile", {
    headers: { Origin: new URL(baseURL!).origin },
    data: { full_name: "Unauthenticated update" },
  });
  expect(response.status()).toBe(401);
});

// Opt in with a configured public Mapbox token and a disposable farmer account.
test("map pin and current location persist without coordinate inputs", async ({ page, context }) => {
  test.skip(!process.env.E2E_MAPBOX_ENABLED || !process.env.E2E_FARMER_EMAIL || !process.env.E2E_FARMER_PASSWORD,
    "Requires E2E_MAPBOX_ENABLED=1, Mapbox configuration, and a disposable farmer account.");
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 7.290572, longitude: 80.633726 });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_FARMER_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_FARMER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)$/);
  await page.goto("/profile");
  await page.getByLabel("Full name *", { exact: true }).fill("Map Test Farmer");
  await choose(page, "District *", "Kandy");
  await page.getByLabel("Town or village *", { exact: true }).fill("Kandy");
  await expect(page.getByRole("button", { name: "Place pin at map centre" })).toBeEnabled({ timeout: 30000 });
  await page.getByRole("button", { name: "Place pin at map centre" }).click();
  await expect(page.getByText("Location selected. An approximate pin will be saved.")).toBeVisible();
  await page.getByRole("button", { name: "Remove location", exact: true }).click();
  await page.getByRole("button", { name: "Use my current location", exact: true }).click();
  await expect(page.getByText("Location selected. An approximate pin will be saved.")).toBeVisible();
  const savedResponse = page.waitForResponse((response) => response.url().endsWith("/api/farmer/profile") && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  const response = await savedResponse;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toMatchObject({ latitude: 7.291, longitude: 80.634 });
  await page.reload();
  await expect(page.getByText("Location selected. An approximate pin will be saved.")).toBeVisible();
  await page.getByRole("button", { name: "Remove location", exact: true }).click();
  await context.clearPermissions();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.locator("[data-sonner-toast][data-type=success]").filter({ hasText: "Your farmer profile has been saved." }).last()).toBeVisible();
  await page.reload();
  await expect(page.getByText("No location selected.", { exact: true })).toBeVisible();
});
