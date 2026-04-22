/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#09090c',
          900: '#0d0d12',
          850: '#111117',
          800: '#16161d',
          750: '#1b1b24',
          700: '#23232e',
          600: '#2d2d3a',
          500: '#3a3a49',
          400: '#55556a',
          300: '#7b7b92',
          200: '#a8a8bd',
          100: '#d7d7e3',
          50:  '#ededf3',
        },
        primary: {
          50:  '#f3efff',
          100: '#e7dfff',
          200: '#d0c0ff',
          300: '#b59bff',
          400: '#9a78ff',
          500: '#8257fe',
          600: '#6b3ef1',
          700: '#5630cd',
          800: '#422ba0',
          900: '#2f217a',
        },
        accent: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        display: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 0 1px rgba(130, 87, 254, 0.35), 0 8px 40px -8px rgba(130, 87, 254, 0.5)',
        'glow-accent': '0 0 0 1px rgba(251, 191, 36, 0.35), 0 8px 40px -8px rgba(251, 191, 36, 0.5)',
        'soft': '0 1px 0 0 rgba(255,255,255,0.02) inset, 0 1px 2px 0 rgba(0,0,0,0.35)',
        'inset-hairline': 'inset 0 0 0 1px rgba(255,255,255,0.04)',
      },
      backgroundImage: {
        'grid-faint': "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
        'hero-glow': 'radial-gradient(1200px 600px at 20% -10%, rgba(130,87,254,0.18), transparent 60%), radial-gradient(900px 500px at 110% 10%, rgba(251,191,36,0.10), transparent 55%)',
      },
      animation: {
        'pulse-ring': 'pulse-ring 2.2s ease-out infinite',
        'shimmer': 'shimmer 2.4s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%':   { transform: 'scale(0.95)', opacity: '0.7' },
          '80%':  { transform: 'scale(1.35)', opacity: '0' },
          '100%': { transform: 'scale(1.35)', opacity: '0' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
