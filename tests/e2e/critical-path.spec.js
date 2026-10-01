// tests/e2e/critical-path.spec.js
// Four smoke tests for what the Node unit tests structurally cannot reach:
// real focus trapping, real key dispatch, real canvas, and the whole
// kata -> answer -> promotion -> toast run at iPhone 13 mini width.

import { expect, test } from '@playwright/test';
import {
    answerCurrentNoun,
    canvasHasInk,
    checkAnswer,
    collectPageErrors,
    currentWord,
    enterNounsKata,
    focusStaysInside,
    gotoDashboard,
    nounAnswers,
    seedRandom,
} from './helpers/dojo.js';

const BELT_INTERVAL = 5; // CONFIG.rules.milestoneInterval: hits per promotion

test.beforeEach(async ({ page }) => {
    await seedRandom(page);
});

test('settings modal traps Tab both ways and hands focus back on Escape', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoDashboard(page);

    // The "," hotkey is the documented way in, so the trap is exercised the way
    // a learner reaches it.
    await page.locator('body').click();
    await page.keyboard.press(',');

    await expect(page.locator('#settingsModal')).toBeVisible();
    await expect(page.locator('#settingsModal [data-modal-initial-focus]')).toBeFocused();

    // Far more presses than the modal has focusable controls: a real trap keeps
    // cycling inside, a broken one lets focus escape on the next wrap.
    expect(await focusStaysInside(page, 'settingsModal', 'Tab', 14)).toBe(true);
    expect(await focusStaysInside(page, 'settingsModal', 'Shift+Tab', 6)).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('#settingsModal')).toBeHidden();
    await expect(page.locator('#settingsBtn')).toBeFocused();

    expect(errors).toEqual([]);
});

test('hotkeys dispatch: kata jump, help, skip, umlaut typing, back to menu', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoDashboard(page);
    await page.locator('body').click();

    await page.keyboard.press('Shift+Digit1');
    await expect(page.locator('#focusView')).toBeVisible();
    await expect(page.locator('#focusKataName')).toHaveText(/Noun/i);

    await page.keyboard.press('?');
    await expect(page.locator('#helpModal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#helpModal')).toBeHidden();

    const before = await currentWord(page);
    await page.keyboard.press('/');
    await expect(page.locator('#kataSections [data-role="word"]')).not.toHaveText(before);

    // "a:" is a beforeinput shortcut, not a key binding: it only proves out when
    // the keystrokes really reach the input.
    const plural = page.locator('#kataSections [data-role="section"]:not(.hidden) [data-role="plural"]');
    if (await plural.isEnabled()) {
        await plural.click();
        await plural.fill('');
        await page.keyboard.type('a:');
        await expect(plural).toHaveValue('ä');

        // Backspace is the exit shortcut, but only outside a field.
        await page.keyboard.press('Backspace');
        await expect(page.locator('#focusView')).toBeVisible();
    }

    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('Backspace');
    await expect(page.locator('#focusView')).toBeHidden();
    await expect(page.locator('#dashboardView')).toBeVisible();

    expect(errors).toEqual([]);
});

test('five correct answers promote the belt, fire confetti, and raise the toast', async ({ page }) => {
    const errors = collectPageErrors(page);
    const answers = nounAnswers();

    await gotoDashboard(page);
    await enterNounsKata(page);

    for (let hit = 1; hit <= BELT_INTERVAL; hit++) {
        await answerCurrentNoun(page, answers);
        await checkAnswer(page);
        await expect(page.locator('#answerVerdictTitle')).toHaveText('Correct!');
        await expect(page.locator('#streakDisplay')).toHaveText(String(hit));

        if (hit === BELT_INTERVAL) {
            // Promotion fires here: toast, milestone sound, confetti burst.
            await expect(page.locator('#milestoneToast')).toBeVisible();
            await expect(page.locator('#milestoneToastTitle')).toHaveText('Belt Promoted!');
            await expect(page.locator('#milestoneToastText')).toContainText('Promoted to \u{1F7E1} Yellow');
        } else {
            // No early promotion: this also pins the milestone interval.
            await expect(page.locator('#milestoneToast')).toBeHidden();
            // Enter while the section is locked means "next", not "check again".
            await page.keyboard.press('Enter');
        }
    }

    // Bursts are staggered 220ms apart, so the canvas needs a moment to paint.
    await expect.poll(() => canvasHasInk(page), { timeout: 5_000 }).toBe(true);
    expect(await page.evaluate(() => {
        const canvas = document.getElementById('fireworksCanvas');
        return canvas.width === window.innerWidth && canvas.height === window.innerHeight;
    })).toBe(true);

    // Persisted, so a reload lands in the same kata with the belt kept.
    await expect(page.locator('#focusBeltBar')).toHaveAttribute('data-label', 'Yellow belt');
    await page.reload();
    await expect(page.locator('#focusView')).toBeVisible();
    await expect(page.locator('#focusBeltBar')).toHaveAttribute('data-label', 'Yellow belt');
    await expect(page.locator('#belt-nouns')).toHaveAttribute('data-label', 'Yellow belt');

    expect(errors).toEqual([]);
});

test('375px viewport: dashboard and kata never scroll sideways', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoDashboard(page);

    const overflow = () => page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);

    expect(await overflow()).toBeLessThanOrEqual(0);

    await enterNounsKata(page);
    expect(await overflow()).toBeLessThanOrEqual(0);

    // The action row is the tightest spot on a small screen.
    await expect(page.locator('#checkAnswerBtn')).toBeInViewport();
    await expect(page.locator('#skipBtn')).toBeVisible();

    expect(errors).toEqual([]);
});