/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EEEDFE',
          100: '#CECBF6',
          200: '#AFA9EC',
          400: '#7F77DD',
          600: '#534AB7',
          800: '#3C3489',
          900: '#26215C',
        },
        // Modern-mode design tokens — CSS variables so light/dark themes and
        // accent colors swap without touching components (see globals.css).
        m: {
          bg:      'rgb(var(--m-bg) / <alpha-value>)',
          surface: 'rgb(var(--m-surface) / <alpha-value>)',
          card:    'rgb(var(--m-card) / <alpha-value>)',
          text:    'rgb(var(--m-text) / <alpha-value>)',
          muted:   'rgb(var(--m-muted) / <alpha-value>)',
          primary: 'rgb(var(--m-primary) / <alpha-value>)',
          primaryHover: 'rgb(var(--m-primary-hover) / <alpha-value>)',
          secondary: 'rgb(var(--m-secondary) / <alpha-value>)',
          soft:  'var(--m-soft)',
          soft2: 'var(--m-soft2)',
        },
      },
      borderColor: {
        'm-line': 'var(--m-line)',
        'm-line2': 'var(--m-soft2)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
      },
    },
  },
  plugins: [],
}
