// katas/verbs/template.js
export const verbsTemplate = `
    <section class="hidden p-6" data-role="section">
        <div class="text-center mt-4 mb-8 lg:mb-10">
            <h2 data-role="word" class="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">gehen</h2>
            <p data-role="meaning" class="text-slate-500 dark:text-slate-400 text-base lg:text-lg mt-0 lg:mt-2 font-medium italic">to go</p>
        </div>
        <div class="max-w-xl mx-auto mb-2">
            <span class="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fill in the Conjugations</span>
        </div>
        <div class="grid grid-cols-1 gap-1.5 lg:gap-3 max-w-xl mx-auto mb-6 font-bold">
            <div class="bg-slate-50 dark:bg-slate-900/80 flex items-center space-x-5">
                <span class="text-sm text-purple-600 dark:text-purple-400 w-20">ich</span>
                <input type="text" autocomplete="off" maxlength="40" data-role="conj_ich" aria-label="ich conjugation" placeholder="e.g. gehe" autocomplete="off" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 lg:py-1.5 text-lg text-indigo-700 dark:text-indigo-300 leading-[2rem] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-purple-500">
            </div>
            <div class="bg-slate-50 dark:bg-slate-900/80 flex items-center space-x-5">
                <span class="text-sm text-purple-600 dark:text-purple-400 w-20">du</span>
                <input type="text" autocomplete="off" maxlength="40" data-role="conj_du" aria-label="du conjugation" placeholder="e.g. gehst" autocomplete="off" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 lg:py-1.5 text-lg text-indigo-700 dark:text-indigo-300 leading-[2rem] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-purple-500">
            </div>
            <div class="bg-slate-50 dark:bg-slate-900/80 flex items-center space-x-5">
                <span class="text-sm text-purple-600 dark:text-purple-400 w-20">er/sie/es</span>
                <input type="text" autocomplete="off" maxlength="40" data-role="conj_er" aria-label="er, sie, es conjugation" placeholder="e.g. geht" autocomplete="off" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 lg:py-1.5 text-lg text-indigo-700 dark:text-indigo-300 leading-[2rem] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-purple-500">
            </div>
            <div class="bg-slate-50 dark:bg-slate-900/80 flex items-center space-x-5">
                <span class="text-sm text-purple-600 dark:text-purple-400 w-20">wir</span>
                <input type="text" autocomplete="off" maxlength="40" data-role="conj_wir" aria-label="wir conjugation" placeholder="e.g. gehen" autocomplete="off" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 lg:py-1.5 text-lg text-indigo-700 dark:text-indigo-300 leading-[2rem] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-purple-500">
            </div>
            <div class="bg-slate-50 dark:bg-slate-900/80 flex items-center space-x-5">
                <span class="text-sm text-purple-600 dark:text-purple-400 w-20">ihr</span>
                <input type="text" autocomplete="off" maxlength="40" data-role="conj_ihr" aria-label="ihr conjugation" placeholder="e.g. geht" autocomplete="off" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 lg:py-1.5 text-lg text-indigo-700 dark:text-indigo-300 leading-[2rem] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-purple-500">
            </div>
            <div class="bg-slate-50 dark:bg-slate-900/80 flex items-center space-x-5">
                <span class="text-sm text-purple-600 dark:text-purple-400 w-20">sie/Sie</span>
                <input type="text" autocomplete="off" maxlength="40" data-role="conj_sie" aria-label="sie or Sie conjugation" placeholder="e.g. gehen" autocomplete="off" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 lg:py-1.5 text-lg text-indigo-700 dark:text-indigo-300 leading-[2rem] placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-purple-500">
            </div>
        </div>
    </section>
`;
