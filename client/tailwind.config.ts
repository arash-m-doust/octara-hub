import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#F5F3F0',
          raised: '#FAFAF8',
          inset: '#EDEAE6',
        },
        border: {
          DEFAULT: '#DDD9D3',
          light: '#E8E5E0',
        },
        accent: {
          DEFAULT: '#5B7FBF',
          soft: '#E8EDF5',
        },
        lavender: '#9B8FBF',
        success: '#7BA87B',
        error: '#BF6B6B',
        warning: '#BFA66B',
        muted: '#9B9B9B',
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
