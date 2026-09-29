/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './assets/js/**/*.js'],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: { sans: ['Inter', 'sans-serif'], pixel: ['"Press Start 2P"', 'monospace'] },
            animation: { 'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite', 'bounce-short': 'bounceShort 0.5s ease-in-out', 'kata-enter': 'kataEnter 260ms cubic-bezier(0.2, 0.9, 0.3, 1) both' },
            keyframes: {
                bounceShort: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
                kataEnter: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'none' } },
            },
        },
    },
    plugins: [],
};
