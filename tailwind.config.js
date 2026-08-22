/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Superfícies
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        // Texto
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        // Marca
        brand: {
          DEFAULT: 'rgb(var(--c-brand) / <alpha-value>)',
          deep: 'rgb(var(--c-brand-deep) / <alpha-value>)',
          soft: 'rgb(var(--c-brand-soft) / <alpha-value>)',
          ink: 'rgb(var(--c-brand-ink) / <alpha-value>)',
        },
        // Semânticos de dinheiro
        lucro: 'rgb(var(--c-lucro) / <alpha-value>)',
        'lucro-soft': 'rgb(var(--c-lucro-soft) / <alpha-value>)',
        custo: 'rgb(var(--c-custo) / <alpha-value>)',
        'custo-soft': 'rgb(var(--c-custo-soft) / <alpha-value>)',
        alerta: 'rgb(var(--c-alerta) / <alpha-value>)',
        'alerta-soft': 'rgb(var(--c-alerta-soft) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -12px rgb(15 23 42 / 0.12)',
        lift: '0 2px 4px rgb(15 23 42 / 0.06), 0 18px 40px -16px rgb(15 23 42 / 0.22)',
        glow: '0 12px 32px -10px rgb(67 56 202 / 0.55)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .28s cubic-bezier(.2,.8,.2,1) both',
        'scale-in': 'scale-in .18s cubic-bezier(.2,.8,.2,1) both',
        'sheet-up': 'sheet-up .3s cubic-bezier(.2,.9,.2,1) both',
      },
    },
  },
  plugins: [],
}
