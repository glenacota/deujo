// katas/nouns/template.js
export const nounsTemplate = `
    <section class="hidden p-6" data-role="section">
        <div class="text-center mt-4 mb-8 lg:mb-10">
            <h2 data-role="word" class="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Loading...</h2>
            <p data-role="meaning" class="text-slate-500 dark:text-slate-400 text-base lg:text-lg mt-0 lg:mt-2 font-medium italic">meaning</p>
        </div>
        <div class="max-w-xl mx-auto mb-6">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Select Noun Gender</label>
            <div class="grid grid-cols-3 gap-3">
                <button type="button" data-role="gender" data-gender="der" class="gender-btn py-1 lg:py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950/80 text-blue-600 dark:text-blue-400 font-bold text-base hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500" aria-pressed="false">der</button>
                <button type="button" data-role="gender" data-gender="die" class="gender-btn py-1 lg:py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950/80 text-rose-600 dark:text-rose-400 font-bold text-base hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500" aria-pressed="false">die</button>
                <button type="button" data-role="gender" data-gender="das" class="gender-btn py-1 lg:py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950/80 text-amber-600 dark:text-amber-400 font-bold text-base hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500" aria-pressed="false">das</button>
            </div>
        </div>
        <div class="max-w-xl mx-auto mb-6">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Type the Plural Form (<em>die ...</em>)</label>
            <input type="text" data-role="plural" placeholder="e.g. Kinder" autocomplete="off" maxlength="40" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 lg:py-1.5 text-lg text-indigo-700 dark:text-indigo-300 leading-[2rem] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-purple-500">
        </div>
    </section>
`;
