/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#2C89B7',
        secondary: '#60C5D1',
        accent: '#F6B73C',
        dark: '#1A1A2E',
        light: '#FFFFFF',
        error: '#FF3333',
        success: '#33CC66',
        sunHover: '#FFD700',
        moonHover: '#2C89B7',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

