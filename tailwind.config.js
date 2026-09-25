/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './assets/js/**/*.js'],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: { sans: ['Inter', 'sans-serif'], pixel: ['"Press Start 2P"', 'monospace'] },
            animation: { 'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite', 'bounce-short': 'bounceShort 0.5s ease-in-out' },
            keyframes: { bounceShort: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } } },
        },
    },
    plugins: [],
};
