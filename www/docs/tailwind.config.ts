import animate from 'tailwindcss-animate'
import plugin from 'tailwindcss/plugin'
import { type Config } from 'tailwindcss'

// https://github.com/withastro/starlight/blob/b56ccc6302f9204841daf6157037a2cb0f92b980/packages/tailwind/index.ts
// The starlight function is copied and modified from the above link.
// MIT License
// Copyright (c) 2023 [Astro contributors](https://github.com/withastro/starlight/graphs/contributors)
const starlight = () =>
  plugin(({ addBase, theme }) => {
    addBase({
      // Restore crucial styles from Tailwind Preflight: https://tailwindcss.com/docs/preflight
      // Allow adding a border to an element by just adding a border-width.
      // (https://github.com/tailwindcss/tailwindcss/pull/116)
      '*, ::before, ::after': {
        borderWidth: '0',
        borderStyle: 'solid',
        borderColor: theme('borderColor.DEFAULT', 'currentColor'),
      },
      '::before, ::after': { '--tw-content': '' },
      // Keep base font-family styles even in non-Starlight pages.
      'html, :host': { 'font-family': theme('fontFamily.sans') },
      'code, kbd, samp, pre': {
        'font-family': theme('fontFamily.mono'),
      },
      // Wire up Starlight theme to use Tailwind config.
      ':root': {
        // Use Tailwind-configured font families.
        '--sl-font': theme('fontFamily.sans'),
        '--sl-font-mono': theme('fontFamily.mono'),
        // Dark mode Starlight theme variables.
        '--sl-color-white': theme('colors.white'),
        '--sl-color-gray-1': theme('colors.gray.200'),
        '--sl-color-gray-2': theme('colors.gray.300'),
        '--sl-color-gray-3': theme('colors.gray.400'),
        '--sl-color-gray-4': theme('colors.gray.600'),
        '--sl-color-gray-5': theme('colors.gray.700'),
        '--sl-color-gray-6': theme('colors.gray.800'),
        '--sl-color-black': theme('colors.gray.900'),
        '--sl-color-accent-low': 'hsl(var(--accent))',
        '--sl-color-accent': 'hsl(var(--accent-foreground))',
        '--sl-color-accent-high': 'hsl(var(--accent-foreground))',
        '--sl-color-bg-sidebar': 'hsl(var(--sidebar-background))',
        '--sl-color-bg-nav': 'hsl(var(--sidebar-background))',
        '--sl-color-hairline-shade': 'hsl(var(--sidebar-border))',
        // Light mode Starlight theme variables
        '&[data-theme="light"]': {
          '--sl-color-white': theme('colors.gray.900'),
          '--sl-color-gray-1': theme('colors.gray.800'),
          '--sl-color-gray-2': theme('colors.gray.700'),
          '--sl-color-gray-3': theme('colors.gray.500'),
          '--sl-color-gray-4': theme('colors.gray.400'),
          '--sl-color-gray-5': theme('colors.gray.300'),
          '--sl-color-gray-6': theme('colors.gray.200'),
          '--sl-color-gray-7': theme('colors.gray.100'),
          '--sl-color-black': theme('colors.white'),
          '--sl-color-accent-low': 'hsl(var(--accent))',
          '--sl-color-accent': 'hsl(var(--accent-foreground))',
          '--sl-color-accent-high': 'hsl(var(--accent-foreground))',
          '--sl-color-bg-sidebar': 'hsl(var(--sidebar-background))',
          '--sl-color-bg-nav': 'hsl(var(--sidebar-background))',
          '--sl-color-hairline-shade': 'hsl(var(--sidebar-border))',
        },
      },
    })
  })

export default {
  // Starlight uses a `data-theme` attribute to power its dark mode.
  darkMode: ['class', '[data-theme="dark"]'],
  corePlugins: {
    // Disable Tailwind’s default reset styles which conflict with Starlight.
    preflight: false,
  },
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  theme: {
    extend: {
      animation: {
        blink: 'blink 1.25s step-end infinite',
      },
      keyframes: {
        blink: {
          '0%': { opacity: '1' },
          '50%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      fontFamily: {
        sans: ['inter', 'sans-serif'],
        mono: ['geistMono', 'serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        gray: 'hsl(var(--background))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground':
            'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground':
            'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
    },
  },
  plugins: [starlight(), animate],
} satisfies Config
