import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npx vite build --mode e2e && npx vite preview --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-portrait-chromium',
      use: { ...devices['Pixel 7'] }
    },
    {
      name: 'mobile-landscape-chromium',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 844, height: 390 },
        screen: { width: 844, height: 390 }
      }
    }
  ]
});
