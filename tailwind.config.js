/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#002147',
          light: '#003366',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#E5C65C',
          dark: '#B8962E',
        },
        'tli-bg': '#F8F9FA',
      },
    },
  },
  plugins: [],
}
