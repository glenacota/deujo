// tests/e2e/critical-path.spec.js
// Four smoke tests for what the Node unit tests structurally cannot reach:
// real focus trapping, real key dispatch, real canvas, and the whole
// kata -> answer -> promotion -> toast run at iPhone 13 mini width.

import { expect, test } from '@playwright/test';
import {
    ACTIVE_SECTION,
    BELT_INTERVAL,
    canvasHasInk,
    collectPageErrors,
    currentWord,
    enterNounsKata,
    focusStaysInside,
    gotoDashboard,
    nounAnswers,
    playCorrectHits,
    seedRandom,
} from './helpers/dojo.js';

test.beforeEach(async ({ page }) => {
    await seedRandom(page);
});

// @tab-navigation runs this on Chromium: headless WebKit moves focus nowhere
// on a Tab press, so a focus trap cannot be exercised there at all.
test('settings modal traps Tab both ways and hands focus back on Escape @tab-navigation', async ({ page }) => {
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
    // Scoped to the visible section: every kata is mounted from boot, so an
    // unscoped selector would also match the hidden verb sections.
    await expect(page.locator(`${ACTIVE_SECTION} [data-role="word"]`)).not.toHaveText(before);

    // "a:" is a beforeinput shortcut, not a key binding: it only proves out when
    // the keystrokes really reach the input.
    const plural = page.locator(`${ACTIVE_SECTION} [data-role="plural"]`);
    if (await plural.isEnabled()) {
        await plural.click();
        await plural.fill('');
        await page.keyboard.type('a:');
        await expect(plural).toHaveValue('ä');

        // Backspace is the exit shortcut, but only outside a field.
        await page.keyboard.press('Backspace');
        await expect(page.locator('#focusView')).toBeVisible();
    }

    // A clicked gender button holds focus, so Backspace must not leave the kata.
    await page.locator(`${ACTIVE_SECTION} [data-role="gender"]`).first().click();
    await page.keyboard.press('Backspace');
    await expect(page.locator('#focusView')).toBeVisible();

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
    await playCorrectHits(page, answers, BELT_INTERVAL, true);

    await expect(page.locator('#milestoneToastText')).toContainText('Promoted to \u{1F7E1} Yellow');

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

test('a skip costs half a belt point and leaves the streak standing', async ({ page }) => {
    const errors = collectPageErrors(page);
    const answers = nounAnswers();

    await gotoDashboard(page);
    await enterNounsKata(page);
    await playCorrectHits(page, answers, 1);
    await expect(page.locator('#focusBeltBar')).toHaveAttribute('title', 'White belt, 1 of 5 points to Yellow belt');

    // Enter advances past the verdict; the skip hotkey only counts while a
    // question is still unanswered.
    await page.keyboard.press('Enter');
    await page.keyboard.press('/');

    // Half a point, so the bar shows a fraction and the streak is untouched.
    await expect(page.locator('#focusBeltBar')).toHaveAttribute('title', 'White belt, 0.5 of 5 points to Yellow belt');
    await expect(page.locator('#streakDisplay')).toHaveText('1');

    expect(errors).toEqual([]);
});

// A picker option is picked by mouse or by its printed digit, and the digit is
// the fast path for drilling. Driven through the real key listener, because the
// wiring from keypress to the active kata is exactly what a unit test fakes.
test('a picker answer is given by its digit alone, with no typing', async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoDashboard(page);
    await page.locator('#kata-prepositions').click();

    const section = page.locator(ACTIVE_SECTION);
    const stage = (role) => section.locator(`[data-role="${role}"] > button`);
    await expect(stage('stage-form')).toHaveCount(0);

    // Step one: the first digit on the open row.
    await page.keyboard.press('1');
    await expect(stage('stage-form')).toHaveCount(4);

    // Step two: its own range starts at 5, so the same "first option" is 5.
    // Read `data-value` rather than the text: the button also carries its
    // printed digit, so its text is "ein5" where the answer is "ein".
    const firstForm = await stage('stage-form').first().getAttribute('data-value');
    await page.keyboard.press('5');
    await expect(section.locator('.pick-slot').first()).toHaveText(firstForm ?? '');

    // A digit the row cannot use is left alone rather than answering something.
    await page.keyboard.press('Enter');
    await expect(page.locator('#answerVerdict')).toBeVisible();

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
