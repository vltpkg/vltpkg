import { defineConfig } from 'astro/config'
import { spawn } from 'child_process'
import starlight from '@astrojs/starlight'
import vercelStatic from '@astrojs/vercel/static'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import { existsSync, readdirSync } from 'fs'
import { basename, relative, resolve } from 'path'
import { fileURLToPath } from 'url'
import { resolve as metaResolve } from 'import-meta-resolve'

const commands = readdirSync(
  fileURLToPath(metaResolve('@vltpkg/cli/commands', import.meta.url)),
)
  .filter(c => c.endsWith('.js'))
  .map(c => basename(c, '.js'))

const PACKAGES = 'packages'

export default defineConfig({
  site: 'https://docs.vlt.sh',
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
      },
      customCss: ['./src/styles/globals.css'],
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 5,
      },
      plugins: [
        {
          name: 'typedoc',
          hooks: {
            async setup({ logger }) {
              if (process.env.NODE_ENV === 'test') {
                logger.warn(`skipping typedoc due to NODE_ENV=test`)
                return
              }
              const dir = resolve(
                import.meta.dirname,
                'src/content/docs',
                PACKAGES,
              )
              if (existsSync(dir)) {
                logger.warn(
                  `using cached typedoc markdown, delete ${relative(process.cwd(), dir)} to rebuild`,
                )
                return
              }
              await new Promise<void>((res, rej) => {
                const proc = spawn('./node_modules/.bin/typedoc', [])
                proc.stdout
                  .setEncoding('utf8')
                  .on('data', (data: string) =>
                    logger.info(data.trim()),
                  )
                proc.stderr
                  .setEncoding('utf8')
                  .on('data', (data: string) =>
                    logger.info(data.trim()),
                  )
                proc
                  .on('close', code =>
                    code === 0 ? res() : (
                      rej(new Error(`typedoc failed`))
                    ),
                  )
                  .on('error', rej)
              })
            },
          },
        },
      ],
      sidebar: [
        {
          label: 'CLI',
          items: [
            { label: 'Getting Started', link: 'cli' },
            { label: 'Configuring', link: 'cli/configuring' },
            {
              label: 'Commands',
              items: commands.map(c => ({
                label: c,
                link: `cli/commands/${c}`,
              })),
            },
          ],
        },
        {
          label: 'Workspaces',
          collapsed: true,
          autogenerate: { directory: PACKAGES },
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
  adapter: vercelStatic(),
})
