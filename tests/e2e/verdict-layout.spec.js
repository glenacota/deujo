// tests/e2e/verdict-layout.spec.js
// The verdict state at 375px on WebKit: wrapped inputs, correction notes and
// the lesson panel must not push the page sideways or bury Check/Next.

import { expect, test } from '@playwright/test';
import { ACTIVE_SECTION, collectPageErrors, gotoDashboard, seedRandom } from './helpers/dojo.js';

const KATAS = ['nouns', 'cases', 'prepositions', 'verbs-pres', 'verbs-praet', 'verbs-perf'];
const ROUNDS = 4;

const overflow = (page) => page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Answers whatever is on screen wrongly: a gibberish word in every open field, the first choice button. */
async function answerWrongly(page) {
    const section = page.locator(ACTIVE_SECTION);
    const choice = section.locator('[data-role="gender"]:visible, [data-role="aux"]:visible').first();
    if (await choice.count()) await choice.click();

    const inputs = section.locator('input:visible:not([disabled])');
    for (let i = 0; i < await inputs.count(); i++) await inputs.nth(i).fill('xyzxyz');
}

test.beforeEach(async ({ page }) => {
    await seedRandom(page);
});

for (const id of KATAS) {
    test(`${id}: verdict state has no sideways scroll and keeps Next reachable`, async ({ page }) => {
        const errors = collectPageErrors(page);
        await gotoDashboard(page);
        await page.locator(`#kata-${id}`).click();
        await expect(page.locator(`${ACTIVE_SECTION} input:visible`).first()).toBeVisible();

        for (let round = 0; round < ROUNDS; round++) {
            await answerWrongly(page);
            await page.locator('#checkAnswerBtn').click();

            await expect(page.locator('#answerVerdict')).toBeVisible();
            await expect(page.locator('#checkAnswerBtn [data-role="label"]')).toHaveText('Next');
            expect(await overflow(page)).toBeLessThanOrEqual(0);
            await expect(page.locator('#answerVerdict')).toBeInViewport();
            await expect(page.locator('#checkAnswerBtn')).toBeInViewport();

            // Locked with readonly, not disabled: iOS greys disabled text and drops the verdict colour.
            const locked = page.locator(`${ACTIVE_SECTION} input:visible:not([disabled])`);
            for (let i = 0; i < await locked.count(); i++) {
                await expect(locked.nth(i)).toHaveJSProperty('readOnly', true);
            }
            await expect(page.locator(ACTIVE_SECTION)).toHaveJSProperty('inert', true);

            await page.locator('#checkAnswerBtn').click();
            await expect(page.locator('#answerVerdict')).toBeHidden();
            await expect(page.locator(ACTIVE_SECTION)).toHaveJSProperty('inert', false);
        }

        expect(errors).toEqual([]);
    });
}
