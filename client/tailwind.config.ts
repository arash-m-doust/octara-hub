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
          plate: 'var(--color-surface-plate)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
          groove: 'var(--color-border-groove)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          glow: 'var(--color-accent-glow)',
          soft: 'var(--color-accent-soft)',
        },
        led: {
          online: 'var(--color-led-online)',
          idle: 'var(--color-led-idle)',
          dnd: 'var(--color-led-dnd)',
          off: 'var(--color-led-off)',
        },
        metal: {
          highlight: 'var(--color-metal-highlight)',
          shadow: 'var(--color-metal-shadow)',
        },
        success: 'var(--color-led-online)',
        error: '#FF5252',
        warning: 'var(--color-led-idle)',
        danger: '#FF5252',
        muted: 'var(--color-text-muted)',
      },
      fontFamily: {
        sans: ['Inter', 'Vazirmatn', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        ind: '6px',
        'ind-lg': '8px',
        'ind-xl': '12px',
      },
      boxShadow: {
        'ind-raised': '0 2px 4px var(--color-metal-shadow), inset 0 1px 0 var(--color-metal-highlight)',
        'ind-panel': '0 3px 10px var(--color-metal-shadow), inset 0 1px 0 var(--color-metal-highlight)',
        'ind-inset': 'inset 0 2px 4px var(--color-metal-shadow), inset 0 1px 2px rgba(0,0,0,0.15)',
        'ind-embossed': 'inset 0 -1px 0 var(--color-metal-shadow), inset 0 1px 0 var(--color-metal-highlight), 0 2px 3px var(--color-metal-shadow)',
        'ind-deep': 'inset 0 3px 6px var(--color-metal-shadow)',
        'ind-modal': '0 10px 30px rgba(0,0,0,0.3), inset 0 1px 0 var(--color-metal-highlight)',
        'led-glow': '0 0 6px var(--color-accent-glow), 0 0 12px var(--color-accent-glow)',
      },
      screens: {
        'mobile': { max: '639px' },
        'tablet': { min: '640px', max: '1023px' },
      },
    },
  },
  plugins: [],
} satisfies Config
