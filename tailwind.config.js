/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0072f5',
          50: '#e6f1ff',
          100: '#b8d6ff',
          200: '#80b5ff',
          300: '#4d94ff',
          400: '#267dff',
          500: '#0072f5',
          600: '#005ad9',
          700: '#0044b3',
          800: '#003087',
          900: '#001c52',
        },
      },
    },
  },
  plugins: [],
}
