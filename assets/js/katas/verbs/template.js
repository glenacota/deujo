// katas/verbs/template.js
export const verbsTemplate = `
    <section class="hidden p-6" data-role="section">
        <div class="text-center mt-4 mb-8 lg:mb-10">
            <h2 data-role="word" class="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">gehen</h2>
            <p data-role="meaning" class="text-slate-500 dark:text-slate-400 text-base lg:text-lg mt-0 lg:mt-2 font-medium italic">to go</p>
        </div>
        <div data-role="six">
        <div class="max-w-xl mx-auto mb-2">
            <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fill in the Conjugations</span>
        </div>
        <div class="grid grid-cols-1 gap-1.5 lg:gap-3 max-w-xl mx-auto mb-6 font-bold">
            <div class="bg-slate-50 dark:bg-slate-900/80 flex items-center space-x-5">
                <span class="text-sm text-purple-600 dark:text-purple-400 w-20">ich</span>
                <input type="text" autocomplete="off" maxlength="40" data-role="conj_ich" aria-label="ich conjugation" placeholder="e.g. gehe" autocapitalize="none" autocorrect="off" spellcheck="false" lang="de" enterkeyhint="next" class="blank-input">
            </div>
            <div class="bg-slate-50 dark:bg-slate-900/80 flex items-center space-x-5">
                <span class="text-sm text-purple-600 dark:text-purple-400 w-20">du</span>
                <input type="text" autocomplete="off" maxlength="40" data-role="conj_du" aria-label="du conjugation" placeholder="e.g. gehst" autocapitalize="none" autocorrect="off" spellcheck="false" lang="de" enterkeyhint="next" class="blank-input">
            </div>
            <div class="bg-slate-50 dark:bg-slate-900/80 flex items-center space-x-5">
                <span class="text-sm text-purple-600 dark:text-purple-400 w-20">er/sie/es</span>
                <input type="text" autocomplete="off" maxlength="40" data-role="conj_er" aria-label="er, sie, es conjugation" placeholder="e.g. geht" autocapitalize="none" autocorrect="off" spellcheck="false" lang="de" enterkeyhint="next" class="blank-input">
            </div>
            <div class="bg-slate-50 dark:bg-slate-900/80 flex items-center space-x-5">
                <span class="text-sm text-purple-600 dark:text-purple-400 w-20">wir</span>
                <input type="text" autocomplete="off" maxlength="40" data-role="conj_wir" aria-label="wir conjugation" placeholder="e.g. gehen" autocapitalize="none" autocorrect="off" spellcheck="false" lang="de" enterkeyhint="next" class="blank-input">
            </div>
            <div class="bg-slate-50 dark:bg-slate-900/80 flex items-center space-x-5">
                <span class="text-sm text-purple-600 dark:text-purple-400 w-20">ihr</span>
                <input type="text" autocomplete="off" maxlength="40" data-role="conj_ihr" aria-label="ihr conjugation" placeholder="e.g. geht" autocapitalize="none" autocorrect="off" spellcheck="false" lang="de" enterkeyhint="next" class="blank-input">
            </div>
            <div class="bg-slate-50 dark:bg-slate-900/80 flex items-center space-x-5">
                <span class="text-sm text-purple-600 dark:text-purple-400 w-20">sie/Sie</span>
                <input type="text" autocomplete="off" maxlength="40" data-role="conj_sie" aria-label="sie or Sie conjugation" placeholder="e.g. gehen" autocapitalize="none" autocorrect="off" spellcheck="false" lang="de" enterkeyhint="done" class="blank-input">
            </div>
        </div>
        </div>
        <div class="hidden" data-role="perf">
            <div class="max-w-xl mx-auto mb-2">
                <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Select the Auxiliary</span>
            </div>
            <div class="grid grid-cols-2 gap-3 max-w-xl mx-auto mb-6">
                <button type="button" data-role="aux" data-aux="sein" class="py-1 lg:py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950/80 text-purple-600 dark:text-purple-400 font-bold text-base hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500" aria-pressed="false">sein</button>
                <button type="button" data-role="aux" data-aux="haben" class="py-1 lg:py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950/80 text-purple-600 dark:text-purple-400 font-bold text-base hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500" aria-pressed="false">haben</button>
            </div>
            <div class="max-w-xl mx-auto mb-6">
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Type the Participle</label>
                <input type="text" data-role="participle" placeholder="e.g. gegangen" autocomplete="off" maxlength="40" autocapitalize="none" autocorrect="off" spellcheck="false" lang="de" enterkeyhint="done" class="blank-input">
            </div>
        </div>
    </section>
`;
