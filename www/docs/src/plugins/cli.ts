import { basename, join } from 'path'
import { type AstroIntegrationLogger } from 'astro'
import { skipDir } from './utils'
import { mkdir, readdir, writeFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { resolve as metaResolve } from 'import-meta-resolve'
import { type CliCommand } from '@vltpkg/cli/types'

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

const frontmatter = (
  title: string,
  sidebar?: { hidden?: boolean; label?: string; order?: number },
) => {
  let sidebarFm = ''
  if (sidebar) {
    sidebarFm = `sidebar:\n`
    if (sidebar.label) {
      sidebarFm += `  label: "${sidebar.label}"\n`
    }
    if (sidebar.hidden) {
      sidebarFm += `  hidden: true\n`
    }
    if (sidebar.order !== undefined) {
      sidebarFm += `  order: ${sidebar.order}\n`
    }
  }
  return `---\ntitle: "${title}"\n${sidebarFm}---\n\n`
}

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
        frontmatter('CLI Commands', { hidden: true }) +
          commands
            .map(c => `- [${c.id}](/cli/commands/${c.id})`)
            .join('\n'),
      )

      await writeFile(
        configuring,
        frontmatter('Configuring the vlt CLI', {
          label: 'Configuring',
          order: 1,
        }) +
          (await importConfig()).jack
            .usageMarkdown()
            .replace(/^# vlt/, ''),
      )

      await mkdir(commandsDir, { recursive: true })

      for (const c of commands) {
        const { usage } = await importCommand(
          join(c.parentPath, c.name),
        )
        await writeFile(
          join(commandsDir, c.id + '.md'),
          frontmatter(`vlt ${c.id}`, { label: c.id }) +
            usage().usageMarkdown(),
        )
      }
    },
  },
}
