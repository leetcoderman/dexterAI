/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../../apps/desktop/src/renderer/src/**/*.{js,ts,jsx,tsx}'
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
      }
    }
  },
  plugins: []
}
