/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c7ff',
          400: '#85a4ff',
          500: '#5677fc',
          600: '#3d52f6',
          700: '#2b3ae2',
          800: '#212cb8',
          900: '#202992',
        },
        darkbg: {
          50: '#1e293b',
          100: '#0f172a',
          200: '#0b0f19', // Premium deep dark background
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
