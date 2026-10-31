export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        trading: {
          bg: '#0B0F17',
          surface: '#121824',
          border: '#1E293B',
          accent: '#06B6D4',
          surplus: '#10B981',
          deficit: '#F43F5E',
          warning: '#F59E0B'
        }
      }
    },
  },
  plugins: [],
}
