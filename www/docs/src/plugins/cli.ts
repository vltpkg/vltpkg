import { basename, join, relative } from 'path'
import { type AstroIntegrationLogger } from 'astro'
import { cacheEntries } from './utils'
import { mkdir, readdir, writeFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { resolve as metaResolve } from 'import-meta-resolve'
import { type CliCommand } from '@vltpkg/cli/types'
import { Config } from '@vltpkg/cli/config'
import matter from 'gray-matter'

const rel = (s: string) => relative(process.cwd(), s)

const loadedConfig = await Config.load()

const commands: { id: string; command: CliCommand }[] = []
for (const c of await readdir(
  fileURLToPath(metaResolve('@vltpkg/cli/commands', import.meta.url)),
  { withFileTypes: true },
)) {
  if (!c.name.endsWith('.js')) continue
  const id = basename(c.name, '.js')
  const command = (await import(
    /* @vite-ignore */ `@vltpkg/cli/commands/${id}`
  )) as CliCommand
  commands.push({ id, command })
}

export const directory = 'cli'

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
          loadedConfig.jack.usageMarkdown().replace(/^# vlt/, ''),
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
        await writeFile(
          join(entries.commandsDir, c.id + '.md'),
          matter.stringify(c.command.usage().usageMarkdown(), {
            title: `vlt ${c.id}`,
            sidebar: { label: c.id },
          }),
        )
      }
    },
  },
}
