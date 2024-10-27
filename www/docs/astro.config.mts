import { defineConfig } from 'astro/config'
import { spawn } from 'child_process'
import starlight from '@astrojs/starlight'
import vercelStatic from '@astrojs/vercel/static'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'

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
      title: 'docs | vlt',
      social: {
        github: 'https://github.com/vltpkg/vltpkg',
        discord: 'https://discord.gg/vltpkg',
      },
      customCss: [
        '@fontsource-variable/manrope/index.css',
        './src/styles/globals.css',
      ],
      plugins: [
        {
          name: 'typedoc',
          hooks: {
            async setup({ logger }) {
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
          autogenerate: { directory: 'cli' },
        },
        {
          label: 'API',
          autogenerate: { directory: 'api' },
        },
        {
          label: 'Packages',
          collapsed: true,
          autogenerate: { directory: 'packages' },
          // items: workspaces.paths.map(path => ({
          //   label: path.name,
          //   collapsed: true,
          //   autogenerate: { directory: `packages/${path.name}` },
          // })),
        },
      ],
    }),
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  output: 'static',
  adapter: vercelStatic(),
})
