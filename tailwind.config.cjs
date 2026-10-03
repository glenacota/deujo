/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './assets/js/**/*.js'],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: { sans: ['Inter', 'sans-serif'] },
            animation: { 'kata-enter': 'kataEnter 260ms cubic-bezier(0.2, 0.9, 0.3, 1) both' },
            keyframes: {
                kataEnter: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'none' } },
            },
        },
    },
    plugins: [],
};
