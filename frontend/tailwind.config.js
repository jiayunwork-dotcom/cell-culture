/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#22c55e',
        secondary: '#0ea5e9',
        accent: '#f59e0b',
        danger: '#ef4444',
        dark: '#1e293b',
        darker: '#0f172a',
      }
    },
  },
  plugins: [],
}
