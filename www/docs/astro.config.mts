import { defineConfig } from 'astro/config'
import { spawn } from 'child_process'
import starlight from '@astrojs/starlight'
import vercelStatic from '@astrojs/vercel/static'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'
import { existsSync, readdirSync } from 'fs'
import { basename, dirname, join, relative, resolve } from 'path'
import { fileURLToPath } from 'url'
import { resolve as metaResolve } from 'import-meta-resolve'
import { mkdir, writeFile } from 'fs/promises'
import { type AstroIntegrationLogger } from 'astro'

if (process.env.CI && process.env.RUNNER_OS === 'Windows') {
  console.log(
    'Skipping astro in CI on Windows because it only needs to be run for linting but not tests',
  )
  process.exit(0)
}

const commands = readdirSync(
  fileURLToPath(metaResolve('@vltpkg/cli/commands', import.meta.url)),
  { withFileTypes: true },
)
  .filter(c => c.name.endsWith('.js'))
  .map(c => ({
    ...c,
    id: basename(c.name, '.js'),
  }))

const PACKAGES = 'packages'
const COMMANDS = 'cli/commands'

const skipOrCacheDir = (
  docsDir: string,
  {
    logger,
    cache,
  }: { cache: boolean; logger: AstroIntegrationLogger },
) => {
  if (process.env.NODE_ENV === 'test') {
    logger.warn(`skipping ${docsDir} due to NODE_ENV=test`)
    return false
  }
  const dir = resolve(
    import.meta.dirname,
    'src/content/docs',
    docsDir,
  )
  if (cache && existsSync(dir)) {
    logger.warn(
      `using cache, delete ${relative(process.cwd(), dir)} to rebuild`,
    )
    return false
  }
  return dir
}

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
      plugins: [
        {
          name: PACKAGES,
          hooks: {
            async setup({ logger }) {
              const dir = skipOrCacheDir(PACKAGES, {
                logger,
                cache: true,
              })
              if (!dir) return
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
        {
          name: COMMANDS,
          hooks: {
            async setup({ logger }) {
              const dir = skipOrCacheDir(COMMANDS, {
                logger,
                cache: false,
              })
              if (!dir) return
              await mkdir(dir, { recursive: true })
              await writeFile(
                dir + '.md',
                `---\ntitle: "CLI Commands"\n---\n` +
                  commands
                    .map(c => `- [${c.id}](/cli/commands/${c.id})`)
                    .join('\n'),
              )
              const { Config } = await import('@vltpkg/cli/config')
              await writeFile(
                join(dirname(dir), 'configuring.md'),
                `---\ntitle: "Configuring the vlt CLI"\n---\n` +
                  (await Config.load()).jack
                    .usageMarkdown()
                    .replace(/^# vlt/, ''),
              )
              for (const c of commands) {
                const { usage } = (await import(
                  /* @vite-ignore */ join(c.parentPath, c.name)
                )) as typeof import('@vltpkg/cli/commands/config')
                await writeFile(
                  join(dir, c.id + '.md'),
                  `---\ntitle: "vlt ${c.id}"\n---\n` +
                    usage().usageMarkdown(),
                )
              }
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
              items: commands
                .map(c => basename(c.name, '.js'))
                .map(c => ({
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
  adapter: vercelStatic({}),
})
