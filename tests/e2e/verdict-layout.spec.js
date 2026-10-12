// tests/e2e/verdict-layout.spec.js
// The verdict state at 375px on WebKit: an answered kata's corrections and the
// lesson panel must not push the page sideways or bury Check/Next.

import { expect, test } from '@playwright/test';
import { ACTIVE_SECTION, collectPageErrors, gotoDashboard, seedRandom } from './helpers/dojo.js';

const KATAS = ['nouns', 'cases', 'prepositions', 'verbs-pres', 'verbs-praet', 'verbs-perf'];
const ROUNDS = 4;

const overflow = (page) => page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);

/**
 * Answers whatever is on screen wrongly: the first choice button, a gibberish
 * word in every open field, and both picker stages on every open blank.
 *
 * The two picker stages are clicked one after the other rather than by "the
 * first button on screen", because step one's row stays on show while step two
 * opens beneath it: a combined locator would keep picking a case, and the blank
 * would never be finished.
 */
async function answerWrongly(page) {
    const section = page.locator(ACTIVE_SECTION);
    const choice = section.locator('[data-role="gender"]:visible, [data-role="aux"]:visible').first();
    if (await choice.count()) await choice.click();

    const inputs = section.locator('input:visible:not([disabled])');
    for (let i = 0; i < await inputs.count(); i++) await inputs.nth(i).fill('xyzxyz');

    // Each pass opens a blank: a case, then the form that case's row offers. The
    // step rows hide once every blank is done, which ends this.
    for (let blank = 0; blank < 8; blank += 1) {
        const caseButton = section
            .locator('[data-role="stage-case"] > button')
            .filter({ visible: true });
        if (!(await caseButton.count())) return;
        await caseButton.first().click();

        const formButton = section
            .locator('[data-role="stage-form"] > button')
            .filter({ visible: true });
        if (await formButton.count()) await formButton.first().click();
    }
}

test.beforeEach(async ({ page }) => {
    await seedRandom(page);
});

/** True once the active section holds something to answer, whichever kind. */
async function section_is_answerable(page) {
    const section = page.locator(ACTIVE_SECTION);
    for (const selector of [
        'input:visible',
        '[data-role="gender"]:visible',
        '[data-role="aux"]:visible',
        '[data-role="stage-case"] > button',
    ]) {
        if (await section.locator(selector).filter({ visible: true }).count()) return true;
    }
    return false;
}

for (const id of KATAS) {
    test(`${id}: verdict state has no sideways scroll and keeps Next reachable`, async ({ page }) => {
        const errors = collectPageErrors(page);
        await gotoDashboard(page);
        await page.locator(`#kata-${id}`).click();
        // Something answerable has to be on screen: a typed field, a choice, or
        // an open picker stage. Which one depends on the kata.
        await expect(section_is_answerable(page)).toBeTruthy();

        for (let round = 0; round < ROUNDS; round++) {
            await answerWrongly(page);
            await page.locator('#checkAnswerBtn').click();

            await expect(page.locator('#answerVerdict')).toBeVisible();
            await expect(page.locator('#answerVerdictLessons .verdict-lesson').first()).toBeVisible();
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
