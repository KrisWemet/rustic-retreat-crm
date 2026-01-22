/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        'muted-2': 'var(--muted-2)',
        link: 'var(--link)',
        accent: {
          DEFAULT: 'var(--accent)',
          2: 'var(--accent-2)',
        },
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        success: 'var(--success)',
        purple: 'var(--purple)',
        yellow: 'var(--yellow)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      fontSize: {
        'page-title': ['var(--text-1)', { lineHeight: '1.2', fontWeight: 'var(--weight-semibold)' }],
        'section-title': ['var(--text-2)', { lineHeight: '1.3', fontWeight: 'var(--weight-semibold)' }],
        'ui-text': ['var(--text-3)', { lineHeight: '1.5' }],
        'meta': ['var(--text-4)', { lineHeight: '1.4' }],
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
      },
      spacing: {
        'gap-1': 'var(--gap-1)',
        'gap-2': 'var(--gap-2)',
        'gap-3': 'var(--gap-3)',
        'gap-4': 'var(--gap-4)',
        'gap-5': 'var(--gap-5)',
        'sidebar-w': 'var(--sidebar-w)',
      },
    },
  },
  plugins: [],
}
