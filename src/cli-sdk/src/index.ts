import { error } from '@vltpkg/error-cause'
import type { Jack } from 'jackspeak'
import { loadPackageJson } from 'package-json-from-dist'
import type { Commands, LoadedConfig } from './config/index.ts'
import { Config } from './config/index.ts'
import { outputCommand, stdout, stderr } from './output.ts'
import type { Views } from './view.ts'
import { debug, emitter } from '@vltpkg/output/log'
import type { Events } from '@vltpkg/output/log'

export type CommandUsage = () => Jack

/**
 * A command function that may return a result of `T`.
 * If the result is `undefined`, no final output will be displayed by default.
 */
export type CommandFn<T = unknown> = (
  conf: LoadedConfig,
) => Promise<T>

export type Command<T> = {
  command: CommandFn<T>
  usage: CommandUsage
  views: Views<T>
}

const { version } = loadPackageJson(
  import.meta.filename,
  process.env.__VLT_INTERNAL_CLI_PACKAGE_JSON,
) as {
  version: string
}

const loadCommand = async <T>(
  command: Commands[keyof Commands] | undefined,
): Promise<Command<T>> => {
  try {
    return (await import(`./commands/${command}.ts`)) as Command<T>
    /* c8 ignore start - should not be possible, just a failsafe */
  } catch (e) {
    throw error('Could not load command', {
      found: command,
      cause: e,
    })
  }
  /* c8 ignore stop */
}

const run = async () => {
  emitter.on('log', (event: Events['log']) => {
    // This is how smoke tests are being debugged for now. But we'll do something
    // similar once we add loglevels so I'm leaving it in.
    /* c8 ignore next 3 */
    if (process.env.__VLT_INTERNAL_SMOKE_TEST) {
      stderr(event.level, ...event.args)
    }
  })

  debug('cli-sdk', 'Start')

  const start = Date.now()
  const vlt = await Config.load(process.cwd(), process.argv)

  if (vlt.get('version')) {
    return stdout(version)
  }

  const cwd = process.cwd()
  const { monorepo } = vlt.options

  // Infer the workspace by being in that directory.
  if (vlt.get('workspace') === undefined) {
    const ws = monorepo?.get(cwd)
    if (ws) {
      vlt.values.workspace = [ws.path]
      vlt.options.workspace = [ws.path]
    }
  }

  const command = await loadCommand(vlt.command)
  debug('cli-sdk', 'Loaded command', vlt.command)
  await outputCommand(command, vlt, { start })

  debug('cli-sdk', 'Done')
}

export default run
