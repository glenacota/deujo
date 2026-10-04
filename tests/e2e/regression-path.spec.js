// tests/e2e/regression-path.spec.js
// Smoke tests for the paths a wrong tap or a stale key can reach: destructive
// clear, negative feedback, and the share fallback. All three assert real
// storage and real DOM, so a regression fails here rather than silently
// keeping or losing a learner's progress.

import { expect, test } from '@playwright/test';
import {
    ACTIVE_SECTION,
    BELT_INTERVAL,
    answerCurrentNoun,
    answerCurrentNounWrongly,
    appStorageKeys,
    checkAnswer,
    collectPageErrors,
    currentWord,
    enterNounsKata,
    gotoDashboard,
    nounAnswers,
    playCorrectHits,
    seedRandom,
} from './helpers/dojo.js';

test.beforeEach(async ({ page }) => {
    await seedRandom(page);
});

test('clear progress wipes every dm_ key and lands on a zeroed dashboard', async ({ page }) => {
    const errors = collectPageErrors(page);
    const answers = nounAnswers();

    await gotoDashboard(page);
    await enterNounsKata(page);
    await playCorrectHits(page, answers, BELT_INTERVAL, true);
    await expect(page.locator('#belt-nouns')).toHaveAttribute('data-label', 'Yellow belt');

    // Progress really is in storage, so the wipe has something to remove.
    expect(await appStorageKeys(page)).toContain('dm_srs_v2');

    await page.locator('body').click();
    await page.keyboard.press(',');
    await page.locator('#settingsClearDataBtn').click();

    // The nested confirm focuses itself, not the destructive button, so Enter
    // or Space right after cannot delete by reflex.
    await expect(page.locator('#settingsClearConfirm')).toBeVisible();
    await expect(page.locator('#settingsClearConfirm')).toBeFocused();
    await expect(page.locator('#settingsClearOkBtn')).not.toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#settingsClearCancelBtn')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#settingsClearOkBtn')).toBeFocused();

    // Esc cancels the confirm without taking the settings panel down with it.
    await page.keyboard.press('Escape');
    await expect(page.locator('#settingsClearConfirm')).toBeHidden();
    await expect(page.locator('#settingsModal')).toBeVisible();
    expect(await appStorageKeys(page)).toContain('dm_belt_progress_nouns');

    // Same box, this time confirmed. The app reloads itself afterwards.
    await page.locator('#settingsClearDataBtn').click();
    await expect(page.locator('#settingsClearOkBtn')).toBeVisible();
    await Promise.all([
        page.waitForEvent('load'),
        page.locator('#settingsClearOkBtn').click(),
    ]);

    await expect(page.locator('#dashboardView')).toBeVisible();
    await expect(page.locator('#belt-nouns')).toHaveAttribute('data-label', 'White belt');
    await expect(page.locator('#streakDisplay')).toHaveText('0');
    await expect(page.locator('#maxStreakDisplay')).toHaveText('0');
    expect(await appStorageKeys(page)).not.toContain('dm_srs_v2');
    expect(await appStorageKeys(page)).not.toContain('dm_belt_progress_nouns');

    // A cleared browser must also forget that focus mode was on, or the reload
    // would drop the learner straight back into a kata with no progress.
    await expect(page.locator('#focusView')).toBeHidden();

    expect(errors).toEqual([]);
});

test('answer, exit, re-enter serves a fresh item and cannot be re-scored', async ({ page }) => {
    const answers = nounAnswers();

    await gotoDashboard(page);
    await enterNounsKata(page);
    const graded = await currentWord(page);
    await answerCurrentNoun(page, answers);
    await checkAnswer(page);
    await expect(page.locator('#streakDisplay')).toHaveText('1');

    await page.locator('#backToMenuBtn').click();
    await page.locator('#kata-nouns').click();
    await expect(page.locator('#focusView')).toBeVisible();

    await expect(page.locator(`${ACTIVE_SECTION} [data-role="word"]`)).not.toHaveText(graded);
    await expect(page.locator('#checkAnswerBtn [data-role="label"]')).toHaveText('Check');
});

test('a wrong answer demotes the belt, resets the streak, and shows the correction', async ({ page }) => {
    const errors = collectPageErrors(page);
    const answers = nounAnswers();

    await gotoDashboard(page);
    await enterNounsKata(page);
    // Promote to Yellow first: only a mistake that crosses a belt boundary
    // reaches the demotion branch, and a fourth hit would stay on White.
    await playCorrectHits(page, answers, BELT_INTERVAL, true);
    await expect(page.locator('#focusBeltBar')).toHaveAttribute('data-label', 'Yellow belt');
    await expect(page.locator('#focusBeltBar')).toHaveAttribute('title', 'Yellow belt, 1 of 5 points to Orange belt');

    await page.keyboard.press('Enter');
    const wrongGender = await answerCurrentNounWrongly(page, answers);
    await checkAnswer(page);

    await expect(page.locator('#answerVerdictTitle')).toHaveText('Wrong answer.');
    await expect(page.locator('#streakDisplay')).toHaveText('0');

    // The chosen gender is marked wrong in place, and the right one right.
    const section = '#kataSections [data-role="section"]:not(.hidden)';
    await expect(page.locator(`${section} [data-gender="${wrongGender}"]`)).toHaveAttribute('data-answer-state', 'wrong');
    await expect(page.locator(`${section} [data-gender]:not([data-gender="${wrongGender}"])[data-answer-state="correct"]`)).toHaveCount(1);

    // A promotion lands a fifth into the new belt, so this first mistake only
    // spends that credit and Yellow still holds.
    await expect(page.locator('#milestoneToast')).toBeHidden();
    await expect(page.locator('#focusBeltBar')).toHaveAttribute('data-label', 'Yellow belt');

    // The next mistake crosses the boundary: dropped back to White, both in the
    // header and on the dashboard card.
    await page.keyboard.press('Enter');
    await answerCurrentNounWrongly(page, answers);
    await checkAnswer(page);

    await expect(page.locator('#milestoneToast')).toBeVisible();
    await expect(page.locator('#milestoneToastTitle')).toHaveText('Belt Demoted');
    await expect(page.locator('#focusBeltBar')).toHaveAttribute('data-label', 'White belt');
    await expect(page.locator('#belt-nouns')).toHaveAttribute('data-label', 'White belt');
    await expect(page.locator('#focusBeltBar')).toHaveAttribute('title', 'White belt, 4 of 5 points to Yellow belt');

    expect(errors).toEqual([]);
});

test('the share fallback opens a readable modal when the clipboard API is missing', async ({ page }) => {
    const errors = collectPageErrors(page);

    // A phone browser without either share or clipboard: the only branch left
    // is the readable fallback modal.
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
        Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    });

    await gotoDashboard(page);
    await page.locator('#progressShareBtn').click();

    await expect(page.locator('#shareModal')).toBeVisible();
    const text = await page.locator('#shareModalText').inputValue();
    expect(text).toContain('White');
    expect(text).toContain('https://deujo.glenacota.me');
    await expect(page.locator('#shareModalText')).toBeFocused();

    // The fallback textarea is selected so the learner can copy by hand.
    expect(await page.evaluate(() => {
        const field = document.getElementById('shareModalText');
        return field.selectionStart === 0 && field.selectionEnd === field.value.length;
    })).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('#shareModal')).toBeHidden();
    await expect(page.locator('#progressShareBtn')).toBeFocused();

    expect(errors).toEqual([]);
});