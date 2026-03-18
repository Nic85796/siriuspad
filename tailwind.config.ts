import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        hover: 'var(--bg-hover)',
        active: 'var(--bg-active)',
        border: 'var(--border)',
        focus: 'var(--border-focus)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: 'var(--accent)',
        success: 'var(--green)',
        danger: 'var(--red)',
        warning: 'var(--yellow)',
        info: 'var(--blue)',
      },
      fontFamily: {
        ui: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      boxShadow: {
        accent: '0 0 0 1px var(--accent-glow), 0 10px 30px rgba(0, 0, 0, 0.28)',
      },
    },
  },
  plugins: [],
}

export default config
