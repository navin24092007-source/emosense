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
          50: '#f0f4ff',
          100: '#e0e8ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#1e1b4b'
        },
        emotion: {
          happy: '#10b981',
          sad: '#3b82f6',
          angry: '#ef4444',
          surprise: '#f59e0b',
          fear: '#8b5cf6',
          disgust: '#84cc16',
          neutral: '#6b7280'
        }
      }
    },
  },
  plugins: [],
}
