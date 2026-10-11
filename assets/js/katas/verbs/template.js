// katas/verbs/template.js
// The verb kata's markup, built from PERSONS so the six rows cannot drift apart
// and a seventh person needs no second copy of the same markup. Which of the two
// forms ships is the only thing that differs between the three verb katas, so it
// is the template's argument rather than a class the kata toggles afterwards.
// Every colour, padding and label here is shared through `.kata-*` in app.css.
import { PERSONS } from '../../services/grammar.js';

/** One `person -> form` row: a label naming the person, and its blank. */
const conjugationRow = ({ key, label }, last) => `
            <div class="kata-row">
                <label class="kata-row-label" for="conj-${key}">${label}</label>
                <input id="conj-${key}" type="text" autocomplete="off" maxlength="40" data-role="conj_${key}" enterkeyhint="${last ? 'done' : 'next'}" class="blank-input">
            </div>`;

/**
 * @param perfekt true to ask one auxiliary plus one participle, false to ask
 *   the six conjugations.
 */
export const verbsTemplate = (perfekt) => `
    <section class="kata-section hidden" data-role="section">
        <div class="kata-head">
            <h2 data-role="word" class="kata-prompt kata-prompt--word">gehen</h2>
            <p data-role="meaning" class="kata-gloss">to go</p>
        </div>
        ${perfekt ? PERFEKT_BLOCK : CONJUGATION_BLOCK}
    </section>
`;

const CONJUGATION_BLOCK = `
        <div class="kata-field">
            <p class="kata-label" id="verbs-conjugation-label">Fill in the Conjugations</p>
            <div class="kata-rows" role="group" aria-labelledby="verbs-conjugation-label">${PERSONS.map(conjugationRow).join('')}</div>
        </div>`;

const PERFEKT_BLOCK = `
        <div class="kata-field">
            <p class="kata-label" id="verbs-aux-label">Select the Auxiliary</p>
            <div class="kata-options kata-options--2" role="group" aria-labelledby="verbs-aux-label">
                <button type="button" data-role="aux" data-aux="sein" class="kata-option" aria-pressed="false">sein</button>
                <button type="button" data-role="aux" data-aux="haben" class="kata-option" aria-pressed="false">haben</button>
            </div>
        </div>
        <div class="kata-field">
            <label class="kata-label" for="verb-participle">Type the Participle</label>
            <input id="verb-participle" type="text" data-role="participle" placeholder="e.g. gegangen" autocomplete="off" maxlength="40" autocapitalize="none" autocorrect="off" spellcheck="false" lang="de" enterkeyhint="done" class="blank-input">
        </div>`;