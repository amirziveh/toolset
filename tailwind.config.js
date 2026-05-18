/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['IRANSansX', 'sans-serif'],
        vazir: ['Vazirmatn', 'sans-serif']
      }
    },
  },
  plugins: [],
}