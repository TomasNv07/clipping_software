/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'app-bg': '#1a1a1a',
        'sidebar-bg': '#0f0f0f',
        'card-bg': '#252525',
        'border': '#333',
        'primary': '#5865f2',
        'text-secondary': '#999',
        'text-tertiary': '#666',
      },
    },
  },
  plugins: [],
}
