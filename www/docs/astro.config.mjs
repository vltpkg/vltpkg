// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import vercelStatic from '@astrojs/vercel/static'

export default defineConfig({
  integrations: [
    starlight({
      title: 'My Docs',
      social: {
        github: 'https://github.com/withastro/starlight',
      },
      sidebar: [
        {
          label: 'Guides',
          items: [{ label: 'Example Guide', slug: 'guides/example' }],
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
      ],
    }),
  ],
  output: 'static',
  adapter: vercelStatic(),
})
