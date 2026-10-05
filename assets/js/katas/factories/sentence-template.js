// katas/factories/sentence-template.js
// The markup every fill-in-the-blank sentence kata renders, which is identical
// apart from the one instruction line above the sentence.
//
// Kept in a factory rather than in each kata's template.js because a kata that
// copied this markup would copy its Tailwind classes too, and Tailwind only
// emits what it finds in a scanned source file: a kata with a stale copy would
// render unstyled, with nothing to fail a test.
//
// @param instruction the one line that tells the learner what to fill in
export function sentenceTemplate(instruction) {
    return `
    <section class="hidden p-6" data-role="section">
        <div class="text-center mt-4 mb-8 lg:mb-10">
            <div class="max-w-xl mx-auto mb-2">
                <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">${instruction}</span>
            </div>
            <p data-role="sentence" class="lg:text-4xl text-lg font-bold text-slate-900 dark:text-white leading-relaxed mx-auto"></p>
            <p data-role="translation" class="text-slate-500 dark:text-slate-400 text-base lg:text-lg mt-2 lg:mt-4 font-medium italic"></p>
        </div>
    </section>
`;
}