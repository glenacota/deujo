// playwright.config.js
// Thin smoke layer for the behaviour unit tests cannot reach: real focus
// trapping, real key events, real canvas, real viewport. Not a coverage mirror.

import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
    testDir: './tests/e2e',
    // Every spec here drives one flow; running them in parallel would only
    // fight over the same 375px-wide viewport semantics.
    workers: 1,
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    timeout: 30_000,
    expect: { timeout: 7_000 },

    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'retain-on-failure',
        // Confetti is display:none under reduced motion, so the canvas test
        // needs motion explicitly allowed.
        reducedMotion: 'no-preference',
    },

    projects: [
        {
            // WebKit is the engine that matters here: it is the one on iOS, and
            // it is the only one that behaves unlike the others (see below).
            name: 'iphone-13-mini',
            use: { ...devices['iPhone 13 mini'], browserName: 'webkit' },
            // The specs that press Tab are excluded: headless WebKit does not
            // implement sequential focus navigation at all, so on a bare page
            // with three buttons a Tab press moves focus nowhere and
            // document.hasFocus() goes false. Nothing in the app can fix that,
            // so those specs run on Chromium below instead.
            grepInvert: /@tab-navigation/,
        },
        {
            name: 'iphone-13-mini-chromium',
            use: { ...devices['iPhone 13 mini'], browserName: 'chromium' },
            // Only the specs that need working Tab focus navigation. Keeping
            // this narrow is the point: Chromium covers the platform the
            // browser cannot, and nothing else should drift onto it.
            grep: /@tab-navigation/,
        },
    ],

    webServer: {
        command: `node tests/e2e/server.mjs`,
        url: `http://localhost:${PORT}`,
        env: { PORT: String(PORT) },
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore',
        stderr: 'pipe',
    },
});
