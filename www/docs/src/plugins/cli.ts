import { basename, join } from 'path'
import { type AstroIntegrationLogger } from 'astro'
import { skipDir } from './utils'
import { mkdir, readdir, writeFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { resolve as metaResolve } from 'import-meta-resolve'
import { type CliCommand } from '@vltpkg/cli/types'
import matter from 'gray-matter'

export const directory = 'cli'

const generated = [
  `${directory}/commands`,
  `${directory}/commands.md`,
  `${directory}/configuring.md`,
]

const importCommand = async (p: string) =>
  (await import(/* @vite-ignore */ p)) as CliCommand

const importConfig = async () =>
  await (await import('@vltpkg/cli/config')).Config.load()

export const plugin = {
  name: directory,
  hooks: {
    async setup({ logger }: { logger: AstroIntegrationLogger }) {
      const dir = skipDir(generated, {
        logger,
        rebuildKey: directory,
      })
      if (!dir) return

      const [commandsDir, commandsIndex, configuring] = dir

      const commands = (
        await readdir(
          fileURLToPath(
            metaResolve('@vltpkg/cli/commands', import.meta.url),
          ),
          { withFileTypes: true },
        )
      )
        .filter(c => c.name.endsWith('.js'))
        .map(c => ({
          ...c,
          id: basename(c.name, '.js'),
        }))

      await writeFile(
        commandsIndex,
        matter.stringify(
          commands
            .map(c => `- [${c.id}](/cli/commands/${c.id})`)
            .join('\n'),
          { title: 'CLI Commands', sidebar: { hidden: true } },
        ),
      )

      await writeFile(
        configuring,
        matter.stringify(
          (await importConfig()).jack
            .usageMarkdown()
            .replace(/^# vlt/, ''),
          {
            title: 'Configuring the vlt CLI',
            sidebar: {
              label: 'Configuring',

              order: 1,
            },
          },
        ),
      )

      await mkdir(commandsDir, { recursive: true })

      for (const c of commands) {
        const { usage } = await importCommand(
          join(c.parentPath, c.name),
        )
        await writeFile(
          join(commandsDir, c.id + '.md'),
          matter.stringify(usage().usageMarkdown(), {
            title: `vlt ${c.id}`,
            sidebar: { label: c.id },
          }),
        )
      }
    },
  },
}
