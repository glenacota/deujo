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
                <div data-role="stage-case" class="kata-options kata-options--4" role="group" aria-label="Which case?"></div>
                <p data-role="prompt-form" class="kata-label" hidden>Step 2 · which form fits?</p>
                <div data-role="stage-form" class="kata-options kata-options--4" role="group" aria-label="Which form?" hidden></div>
            </div>
            <div data-role="review" class="kata-stack" hidden></div>
            <p data-role="progress" class="kata-note"></p>
        </div>
    </section>
`;
}