// katas/factories/picker-template.js
// The markup both two-stage picker katas render, identical apart from the one
// instruction line at the top.
//
// Kept in a factory rather than in each kata's template.js because a kata that
// copied this markup would copy its Tailwind classes too, and Tailwind only
// emits what it finds in a scanned source file: a kata with a stale copy would
// render unstyled, with nothing to fail a test.
//
// Three blocks rather than one that swaps its contents, so the learner never
// loses their place: step one's row of case buttons stays on show with the
// chosen case pressed, step two opens beneath it, and a per-blank review list
// takes over once every blank is answered.
//
// @param instruction the one line that tells the learner what they are doing
export function pickerTemplate(instruction) {
    return `
    <section class="hidden p-6" data-role="section">
        <div class="text-center mt-4 mb-6 lg:mb-8">
            <div class="max-w-xl mx-auto mb-2">
                <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">${instruction}</span>
            </div>
            <p data-role="sentence" class="lg:text-3xl text-xl font-bold text-slate-900 dark:text-white leading-relaxed mx-auto"></p>
            <p data-role="translation" class="text-slate-500 dark:text-slate-400 text-base lg:text-lg mt-2 lg:mt-3 font-medium italic"></p>
        </div>
        <div class="max-w-xl mx-auto" data-role="picker">
            <div data-role="steps" hidden>
                <p data-role="prompt" class="picker-step-label picker-step-label--case"></p>
                <div data-role="stage-case" class="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3" role="group" aria-label="Which case?"></div>
                <p data-role="prompt-form" class="picker-step-label picker-step-label--form" hidden>Step 2 · which form fits?</p>
                <div data-role="stage-form" class="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3" role="group" aria-label="Which form?" hidden></div>
            </div>
            <div data-role="review" class="space-y-3" hidden></div>
            <p data-role="progress" class="mt-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"></p>
        </div>
    </section>
`;
}