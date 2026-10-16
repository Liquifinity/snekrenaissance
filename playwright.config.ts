import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173',
      port: 4173,
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'npm run worker:migrate && npm run worker:dev -- --port 8787',
      url: 'http://127.0.0.1:8787/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: 'npx vite --mode e2e-ranked --host 127.0.0.1 --port 4174',
      port: 4174,
      reuseExistingServer: !process.env.CI
    }
  ],
  projects: [
    {
      name: 'desktop-chromium',
      testIgnore: '**/ranked.spec.ts',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-chromium',
      testIgnore: '**/ranked.spec.ts',
      use: { ...devices['Pixel 7'] }
    },
    {
      name: 'ranked-chromium',
      testMatch: '**/ranked.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174' }
    }
  ]
});
