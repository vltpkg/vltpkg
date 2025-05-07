import type { ErrorWithCauseObject } from '@vltpkg/error-cause'
import { error } from '@vltpkg/error-cause'
import type { Jack } from 'jackspeak'
import { loadPackageJson } from 'package-json-from-dist'
import {
  getSortedCliOptions,
  getSortedKeys,
} from './config/definition.ts'
import type { Commands, LoadedConfig } from './config/index.ts'
import { Config } from './config/index.ts'
import { outputCommand, stderr, stdout } from './output.ts'
import { indent } from './print-err.ts'
import type { Views } from './view.ts'

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

const isErrorWithCauseObject = (
  err: unknown,
): err is ErrorWithCauseObject =>
  !!err &&
  typeof err === 'object' &&
  err instanceof Error &&
  !!err.cause &&
  typeof err.cause === 'object' &&
  'code' in err.cause &&
  err.cause.code === 'JACKSPEAK' &&
  'found' in err.cause

const loadVlt = async (cwd: string, argv: string[]) => {
  try {
    return await Config.load(cwd, argv)
  } catch (err) {
    if (isErrorWithCauseObject(err)) {
      const { found, path, wanted, name } = err.cause
      const isConfigFile = typeof path === 'string'
      const msg =
        isConfigFile ?
          `Problem in Config File ${path}`
        : 'Invalid Option Flag'
      const validOptions =
        wanted ? undefined
        : isConfigFile ? getSortedKeys()
        : getSortedCliOptions()

      stderr(msg)
      stderr(err.message)
      if (name) stderr(indent('Field: ' + name))
      if (found) stderr(indent('Found: ' + JSON.stringify(found)))
      if (typeof wanted === 'string') {
        stderr(indent('Wanted: ' + wanted))
      }
      if (validOptions) {
        stderr(indent('Valid Options:'))
        stderr(indent(validOptions.join('\n'), 4))
      }

      stderr(
        indent(
          `Run 'vlt help' for more information about available options.`,
        ),
      )
      return process.exit(process.exitCode || 1)
    }
    /* c8 ignore next 2 - still throw in config fails for some reason */
    throw err
  }
}

const run = async () => {
  const start = Date.now()
  const cwd = process.cwd()
  const vlt = await loadVlt(cwd, process.argv)

  if (vlt.get('version')) {
    return stdout(version)
  }

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
  await outputCommand(command, vlt, { start })
}

export default run
