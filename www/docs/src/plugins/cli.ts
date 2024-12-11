import { basename, join, relative } from 'path'
import { type AstroIntegrationLogger } from 'astro'
import { cacheEntries } from './utils'
import { mkdir, readdir, writeFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { resolve as metaResolve } from 'import-meta-resolve'
import { type CliCommand } from '@vltpkg/cli/types'
import { Config } from '@vltpkg/cli/config'
import matter from 'gray-matter'

const CLI_COMMANDS = '@vltpkg/cli/commands'

export const directory = 'cli'

const rel = (s: string) => relative(process.cwd(), s)

export const plugin = {
  name: directory,
  hooks: {
    async setup({ logger }: { logger: AstroIntegrationLogger }) {
      const commandPath = `${directory}/commands`
      const entries = cacheEntries(
        {
          commandsDir: commandPath,
          commandsIndex: `${directory}/commands.md`,
          configuring: `${directory}/configuring.md`,
        },
        directory,
        logger,
      )
      if (!entries) return

      const commands = (
        await readdir(
          fileURLToPath(metaResolve(CLI_COMMANDS, import.meta.url)),
          { withFileTypes: true },
        )
      )
        .filter(c => c.name.endsWith('.js'))
        .map(c => ({
          ...c,
          id: basename(c.name, '.js'),
        }))

      logger.info(`writing ${rel(entries.commandsIndex)}`)
      await writeFile(
        entries.commandsIndex,
        matter.stringify(
          commands
            .map(c => `- [${c.id}](/${commandPath}/${c.id})`)
            .join('\n'),
          { title: 'CLI Commands', sidebar: { hidden: true } },
        ),
      )

      logger.info(`writing ${rel(entries.configuring)}`)
      await writeFile(
        entries.configuring,
        matter.stringify(
          (await Config.load()).jack
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

      logger.info(`writing ${rel(entries.commandsDir)}`)
      await mkdir(entries.commandsDir, { recursive: true })
      for (const c of commands) {
        const { usage } = (await import(
          /* @vite-ignore */ `${CLI_COMMANDS}/${c.id}`
        )) as CliCommand
        await writeFile(
          join(entries.commandsDir, c.id + '.md'),
          matter.stringify(usage().usageMarkdown(), {
            title: `vlt ${c.id}`,
            sidebar: { label: c.id },
          }),
        )
      }
    },
  },
}
