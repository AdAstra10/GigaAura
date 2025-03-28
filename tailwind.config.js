/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2C89B7',
        secondary: '#60C5D1',
        accent: '#F6B73C',
        dark: '#1A1A2E',
        light: '#F5F5F7',
        error: '#FF3333',
        success: '#33CC66',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

