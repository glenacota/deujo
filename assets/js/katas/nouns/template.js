// katas/nouns/template.js
// The noun kata's markup: a word, its gloss, then a gender row and a plural
// field. Every colour, padding and label here is shared through `.kata-*` in
// app.css, so this file carries only what is different about this kata.
export const nounsTemplate = `
    <section class="kata-section hidden" data-role="section">
        <div class="kata-head">
            <h2 data-role="word" class="kata-prompt kata-prompt--word">Loading...</h2>
            <p data-role="meaning" class="kata-gloss">meaning</p>
        </div>
        <div class="kata-field">
            <p class="kata-label" id="nouns-gender-label">Select Noun Gender</p>
            <div class="kata-options kata-options--3" role="group" aria-labelledby="nouns-gender-label">
                <button type="button" data-role="gender" data-gender="der" class="kata-option" aria-pressed="false">der</button>
                <button type="button" data-role="gender" data-gender="die" class="kata-option" aria-pressed="false">die</button>
                <button type="button" data-role="gender" data-gender="das" class="kata-option" aria-pressed="false">das</button>
            </div>
        </div>
        <div class="kata-field">
            <label class="kata-label" for="noun-plural">Type the Plural Form (<em>die ...</em>)</label>
            <input id="noun-plural" type="text" data-role="plural" placeholder="e.g. Kinder" autocomplete="off" maxlength="40" autocapitalize="none" autocorrect="off" spellcheck="false" lang="de" enterkeyhint="done" class="blank-input">
        </div>
    </section>
`;