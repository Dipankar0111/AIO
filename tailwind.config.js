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
        theme: {
          main: 'var(--bg-main)',
          sidebar: 'var(--bg-sidebar)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          border: 'var(--border-default)',
          borderStrong: 'var(--border-strong)',
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          brand: 'var(--primary-brand)',
          brandHover: 'var(--brand-hover)',
          accent: 'var(--accent)',
          accentLight: 'var(--accent-light)',
          code: 'var(--code-bg)'
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'card': '16px',
        'btn': '10px',
        'input': '12px',
      },
      transitionDuration: {
        '160': '160ms',
        '180': '180ms',
        '200': '200ms',
        '220': '220ms',
        '240': '240ms',
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(41, 35, 30, 0.04), 0 1px 2px rgba(41, 35, 30, 0.02)',
        'warm-md': '0 4px 16px -2px rgba(41, 35, 30, 0.06), 0 2px 6px -1px rgba(41, 35, 30, 0.03)',
        'warm-lg': '0 12px 32px -4px rgba(41, 35, 30, 0.08), 0 4px 12px -2px rgba(41, 35, 30, 0.04)',
      }
    },
  },
  plugins: [],
}
