import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
          inset: 'var(--color-surface-inset)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          soft: 'var(--color-accent-soft)',
        },
        lavender: '#9B8FBF',
        success: '#7BA87B',
        error: '#BF6B6B',
        warning: '#BFA66B',
        danger: '#BF6B6B',
        muted: 'var(--color-text-muted)',
      },
      fontFamily: {
        sans: ['Inter', 'Vazirmatn', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        skeu: '10px',
        'skeu-lg': '14px',
        'skeu-xl': '20px',
      },
      boxShadow: {
        'skeu-raised': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'skeu-panel': '0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'skeu-modal': '0 8px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        'skeu-inset': 'inset 0 1px 3px rgba(0,0,0,0.06)',
        'skeu-embossed': 'inset 0 -1px 0 rgba(255,255,255,0.8), 0 1px 2px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config
