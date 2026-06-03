import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary': '#98cbff',
        'on-primary': '#003354',
        'primary-container': '#00a3ff',
        'on-primary-container': '#00375a',
        'surface': '#051424',
        'surface-dim': '#051424',
        'surface-bright': '#2c3a4c',
        'surface-container-lowest': '#010f1f',
        'surface-container-low': '#0d1c2d',
        'surface-container': '#122131',
        'surface-container-high': '#1c2b3c',
        'surface-container-highest': '#273647',
        'on-surface': '#d4e4fa',
        'on-surface-variant': '#bec7d4',
        'surface-variant': '#273647',
        'outline': '#88919d',
        'outline-variant': '#3f4852',
        'error': '#ffb4ab',
        'error-container': '#93000a',
        'on-error': '#690005',
        'on-error-container': '#ffdad6',
        'secondary': '#c2c6d8',
        'secondary-container': '#424655',
        'on-secondary': '#2b303e',
        'on-secondary-container': '#b0b4c6',
        'tertiary': '#c3c6d3',
        'tertiary-container': '#999ca9',
        'on-tertiary': '#2c303a',
        'on-tertiary-container': '#30343e',
        'inverse-surface': '#d4e4fa',
        'inverse-on-surface': '#233143',
        'inverse-primary': '#00629d',
        'background': '#051424',
        'on-background': '#d4e4fa',
      },
      fontFamily: {
        sans: ['Space Grotesk', '-apple-system', 'sans-serif'],
        mono: ['Roboto Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
