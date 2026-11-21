import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout du front. L'API est simulée (e2e/mock-api.ts) :
 * ils tournent sans back-end, en local comme en CI.
 * PW_CHANNEL=chrome utilise le Chrome installé au lieu du Chromium de Playwright.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4180',
    trace: 'retain-on-failure',
    channel: process.env.PW_CHANNEL,
  },
  projects: [
    { name: 'bureau', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: process.env.PW_CHANNEL } },
  ],
  webServer: {
    command: 'pnpm exec vite --port 4180 --strictPort',
    url: 'http://localhost:4180',
    reuseExistingServer: !process.env.CI,
    // Aucune API réelle : le proxy ne doit jamais être atteint.
    env: { VITE_API_PROXY: 'http://127.0.0.1:9' },
  },
});
