// katas/factories/picker-template.js
// The markup both picker katas render; shared so a copy cannot drift.
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
        </div>
    </section>
`;
}