// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import vercelStatic from '@astrojs/vercel/static'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'

export default defineConfig({
  integrations: [
    starlight({
      title: 'docs | vlt',
      social: {
        github: 'https://github.com/vltpkg/vltpkg',
        discord: 'https://github.com/vltpkg/vltpkg',
      },
      customCss: [
        '@fontsource-variable/manrope/index.css',
        './src/styles/globals.css',
      ],
      sidebar: [
        {
          label: 'Guides',
          items: [{ label: 'Example Guide', slug: 'guides/example' }],
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
        {
          label: 'Commands',
          autogenerate: { directory: 'cli/commands' },
        },
        {
          label: 'API',
          autogenerate: { directory: 'api' },
        },
      ],
    }),
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  output: 'static',
  adapter: vercelStatic(),
})
