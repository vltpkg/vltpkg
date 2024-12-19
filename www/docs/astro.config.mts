import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import vercel from '@astrojs/vercel'
import * as TypedocPlugin from './src/plugins/typedoc'
import * as CliPlugin from './src/plugins/cli'
import { cpSync } from 'fs'
import starlightLinksValidator from 'starlight-links-validator'

if (process.env.CI && process.env.RUNNER_OS === 'Windows') {
  console.log(
    'Skipping astro in CI on Windows because it only needs to be run for linting but not tests',
  )
  process.exit(0)
}

export default defineConfig({
  site: 'https://docs.vlt.sh',
  trailingSlash: 'never',
  integrations: [
    starlight({
      expressiveCode: {
        themes: ['aurora-x', 'catppuccin-latte'],
        defaultProps: {
          wrap: true,
          preserveIndent: true,
        },
      },
      title: 'vlt /vōlt/',
      social: {
        linkedin: 'https://www.linkedin.com/company/vltpkg',
        twitter: 'https://twitter.com/vltpkg',
        github: 'https://github.com/vltpkg/vltpkg',
        discord: 'https://discord.gg/vltpkg',
      },
      components: {
        Header: './src/components/header/astro-header.astro',
        Sidebar: './src/components/sidebar/astro-app-sidebar.astro',
        PageFrame:
          './src/components/page-frame/astro-page-frame.astro',
        ContentPanel:
          './src/components/content-panel/astro-content-panel.astro',
        PageTitle:
          './src/components/page-title/astro-page-title.astro',
        Pagination:
          './src/components/pagination/astro-pagination.astro',
        PageSidebar:
          './src/components/page-sidebar/astro-page-sidebar.astro',
        TwoColumnContent:
          './src/components/two-column-layout/astro-two-column-layout.astro',
        Hero: './src/components/hero/astro-hero.astro',
        Footer: './src/components/footer/astro-footer.astro',
        ThemeSelect:
          './src/components/theme-select/astro-theme-select.astro',
      },
      customCss: ['./src/styles/globals.css'],
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 5,
      },
      plugins: [
        TypedocPlugin.plugin,
        CliPlugin.plugin,
        starlightLinksValidator({
          // work around bug in the link validator that strips
          // the index off of the last segment
          exclude: ['/packages/*/module_index?(#*)'],
        }),
      ],
      sidebar: [
        {
          label: 'CLI',
          autogenerate: { directory: CliPlugin.directory },
        },
        {
          label: 'Packages',
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
    // astro v5 and the vercel adapter don't play well with
    // content that is generated after the build such as the
    // pagefind JS. So we copy it manually.
    // https://github.com/withastro/adapters/issues/445
    {
      name: 'copy-pagefind',
      hooks: {
        'astro:build:done': async () => {
          cpSync(
            'dist/pagefind',
            './.vercel/output/static/pagefind',
            {
              recursive: true,
            },
          )
        },
      },
    },
  ],
  output: 'static',
  adapter: vercel(),
})
