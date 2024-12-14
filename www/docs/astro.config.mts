import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import * as TypedocPlugin from './src/plugins/typedoc'
import * as CliPlugin from './src/plugins/cli'

if (process.env.CI && process.env.RUNNER_OS === 'Windows') {
  console.log(
    'Skipping astro in CI on Windows because it only needs to be run for linting but not tests',
  )
  process.exit(0)
}

export default defineConfig({
  site: 'https://docs.vlt.sh',
  integrations: [
    starlight({
      title: 'docs | vlt',
      social: {
        github: 'https://github.com/vltpkg/vltpkg',
        discord: 'https://discord.gg/vltpkg',
        twitter: 'https://twitter.com/vltpkg',
      },
      customCss: [
        '@fontsource-variable/manrope/index.css',
        './src/styles/globals.css',
      ],
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 5,
      },
      plugins: [TypedocPlugin.plugin, CliPlugin.plugin],
      sidebar: [
        {
          label: 'CLI',
          autogenerate: { directory: CliPlugin.directory },
        },
        {
          label: 'Workspaces',
          collapsed: true,
          autogenerate: { directory: TypedocPlugin.directory },
        },
        {
          label: 'Serverless Registry',
          link: 'https://www.vlt.sh/serverless-registry',
        },
      ],
    }),
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  output: 'static',
})
