// katas/factories/picker-template.js
// The markup both two-stage picker katas render.
//
// Kept in a factory rather than in each kata's template.js because a kata that
// copied this markup would copy its Tailwind classes too, and Tailwind only
// emits what it finds in a scanned source file: a kata with a stale copy would
// render unstyled, with nothing to fail a test. With the shared look in
// app.css instead, a copy could not drift visually at all.
//
// Three blocks rather than one that swaps its contents, so the learner never
// loses their place: step one's row of case buttons stays on show with the
// chosen case pressed, step two opens beneath it, and a per-blank review list
// takes over once every blank is answered.
export function pickerTemplate() {
    return `
    <section class="kata-section hidden" data-role="section">
        <div class="kata-head">
            <p data-role="sentence" class="kata-prompt kata-prompt--sentence"></p>
            <p data-role="translation" class="kata-gloss"></p>
        </div>
        <div class="kata-field" data-role="picker">
            <div class="kata-stack" data-role="steps" hidden>
                <p data-role="prompt" class="kata-label"></p>
                <button type="button" data-role="case-chip" class="kata-option pick-chip" hidden></button>
                <div data-role="stage-case" class="kata-options kata-options--4" role="group" aria-label="Select the case"></div>
                <p data-role="prompt-form" class="kata-label" hidden>Select the form</p>
                <div data-role="stage-form" class="kata-options kata-options--4" role="group" aria-label="Select the form" hidden></div>
            </div>
            <div data-role="review" class="kata-stack" hidden></div>
        </div>
    </section>
`;
}