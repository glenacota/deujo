// tests/e2e/helpers/dojo.js
// Shared steps for the smoke specs. Everything here talks to the real page:
// no stubs, no module mocking, only a seeded Math.random so the kata that
// comes up is reproducible from run to run.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect } from '@playwright/test';

const ROOT = resolve(import.meta.dirname, '../../..');

export const ACTIVE_SECTION = '#kataSections [data-role="section"]:not(.hidden)';

/** CONFIG.rules.milestoneInterval: correct answers per belt promotion. */
export const BELT_INTERVAL = 5;

/** word -> { gender, plural } straight from the shipped dataset. */
export function nounAnswers() {
    const dataset = JSON.parse(readFileSync(resolve(ROOT, 'assets/datasets/nouns.json'), 'utf8'));
    return new Map(dataset.map((noun) => [
        noun.w,
        { gender: noun.g, plural: typeof noun.p === 'string' ? noun.p : (noun.p?.a ?? null) },
    ]));
}

/** Collects uncaught page errors so a spec can assert the run stayed clean. */
export function collectPageErrors(page) {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    return errors;
}

/**
 * Deterministic Math.random without collapsing it to a constant: SRS picks and
 * confetti positions still spread out, but the same run happens every time.
 * Must be installed before the app boots, so it runs in addInitScript.
 */
export async function seedRandom(page, seed = 42) {
    await page.addInitScript((initial) => {
        let state = initial >>> 0;
        Math.random = () => {
            state = (state * 1664525 + 1013904223) >>> 0;
            return state / 4294967296;
        };
    }, seed);
}

export async function gotoDashboard(page) {
    await page.goto('/');
    await expect(page.locator('#kata-nouns')).toBeVisible();
}

/** Opens the nouns kata and waits for a real exercise instead of "Loading...". */
export async function enterNounsKata(page) {
    await page.locator('#kata-nouns').click();
    await expect(page.locator('#focusView')).toBeVisible();
    await expect(page.locator(`${ACTIVE_SECTION} [data-role="word"]`)).not.toHaveText('Loading...');
    return page.locator(ACTIVE_SECTION);
}

export function currentWord(page) {
    return page.locator(`${ACTIVE_SECTION} [data-role="word"]`).textContent().then((text) => text.trim());
}

export function currentSection(page) {
    return page.locator(ACTIVE_SECTION);
}

/** Fills gender and plural from the dataset entry for whatever word is up. */
export async function answerCurrentNoun(page, answers) {
    const section = currentSection(page);
    const word = await currentWord(page);
    const answer = answers.get(word);
    if (!answer) throw new Error(`No dataset answer for the rendered word "${word}"`);

    await section.locator(`[data-role="gender"][data-gender="${answer.gender}"]`).click();

    // 34 dataset nouns have no plural, and the kata disables the field for them.
    const plural = section.locator('[data-role="plural"]');
    if (await plural.isEnabled()) await plural.fill(answer.plural ?? '');

    return answer;
}

/** Picks the wrong gender on purpose, so the answer is wrong whatever the noun. */
export async function answerCurrentNounWrongly(page, answers) {
    const section = currentSection(page);
    const word = await currentWord(page);
    const answer = answers.get(word);
    if (!answer) throw new Error(`No dataset answer for the rendered word "${word}"`);

    const wrong = ['der', 'die', 'das'].filter((g) => g !== answer.gender)[0];
    await section.locator(`[data-role="gender"][data-gender="${wrong}"]`).click();

    const plural = section.locator('[data-role="plural"]');
    if (await plural.isEnabled()) await plural.fill(answer.plural ?? '');

    return wrong;
}

/**
 * Answers `hits` exercises correctly, asserting the streak each time and
 * advancing with Enter (which means "next" while the section is locked).
 * @param {boolean} expectPromotion true when the last hit should hit a belt
 */
export async function playCorrectHits(page, answers, hits, expectPromotion = false) {
    for (let hit = 1; hit <= hits; hit++) {
        await answerCurrentNoun(page, answers);
        await checkAnswer(page);

        await expect(page.locator('#answerVerdictTitle')).toHaveText('Correct!');
        await expect(page.locator('#streakDisplay')).toHaveText(String(hit));

        const last = hit === hits;
        if (last && expectPromotion) {
            await expect(page.locator('#milestoneToast')).toBeVisible();
            await expect(page.locator('#milestoneToastTitle')).toHaveText('Belt Promoted!');
        } else {
            // No early promotion: this also pins the milestone interval.
            await expect(page.locator('#milestoneToast')).toBeHidden();
        }

        if (!last) await page.keyboard.press('Enter');
    }
}

export async function checkAnswer(page) {
    await page.locator('#checkAnswerBtn').click();
}

/** Every app-owned localStorage key, so a wipe can be verified from the page. */
export function appStorageKeys(page) {
    return page.evaluate(() => {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('dm_')) keys.push(key);
        }
        return keys;
    });
}

/** True when the confetti canvas holds at least one painted pixel. */
export function canvasHasInk(page) {
    return page.evaluate(() => {
        const canvas = document.getElementById('fireworksCanvas');
        if (!canvas?.width || !canvas?.height) return false;
        const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 0) return true;
        }
        return false;
    });
}

/** Focus must never leave an open modal, in either Tab direction. */
export async function focusStaysInside(page, modalId, key, presses) {
    for (let i = 0; i < presses; i++) {
        await page.keyboard.press(key);
        const inside = await page.evaluate(
            (id) => Boolean(document.getElementById(id)?.contains(document.activeElement)),
            modalId,
        );
        if (!inside) return false;
    }
    return true;
}