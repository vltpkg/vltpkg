// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import vercelStatic from '@astrojs/vercel/static'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'

export default defineConfig({
  vite: {
    build: {
      rollupOptions: {
        // This is necessary to treeshake the imports @vltpkg/cli commands
        // since we only use the `usage`
        treeshake: 'smallest',
      },
    },
  },
  integrations: [
    starlight({
      title: 'docs | vlt',
      social: {
        github: 'https://github.com/vltpkg/vltpkg',
        discord: 'https://discord.gg/vltpkg',
      },
      customCss: [
        '@fontsource-variable/manrope/index.css',
        './src/styles/globals.css',
      ],
      sidebar: [
        {
          label: 'CLI',
          autogenerate: { directory: 'cli' },
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
