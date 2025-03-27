/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3366FF',
        secondary: '#6C63FF',
        accent: '#FF9900',
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

