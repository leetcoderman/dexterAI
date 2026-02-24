/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/antigravity/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        elevated: 'var(--color-elevated)',
        overlay: 'var(--color-overlay)',
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        text: 'var(--color-text)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        border: 'var(--color-border)',
        'border-subtle': 'var(--color-border-subtle)',
        'sidebar-bg': 'var(--color-sidebar)',
        'sidebar-active': 'var(--color-sidebar-active)',
        'input-bg': 'var(--color-input)',
        'input-border': 'var(--color-input-border)'
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', 'monospace']
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px'
      },
      boxShadow: {
        glow: '0 0 20px rgba(88, 101, 242, 0.15)',
        'glow-lg': '0 0 40px rgba(88, 101, 242, 0.2)',
        card: '0 2px 10px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 4px 20px rgba(0, 0, 0, 0.3)'
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out'
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
