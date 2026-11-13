import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    retries: 0,
    use: {
        baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
        // Auth requests contain credentials. Do not record traces or video.
        trace: "off",
        video: "off",
        screenshot: "off",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: process.env.E2E_BASE_URL ? undefined : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
    },
});
