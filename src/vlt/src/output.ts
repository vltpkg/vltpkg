import chalk from 'chalk'
import {
  type CliCommand,
  type CliCommandResult,
  type LoadedConfig,
} from './types.js'
import { isErrorRoot } from '@vltpkg/error-cause'

// TODO: make these have log levels etc
// eslint-disable-next-line no-console
export const stdout = (...args: unknown[]) => console.log(...args)
// eslint-disable-next-line no-console
export const stderr = (...args: unknown[]) => console.error(...args)

export const outputCommand = (
  commandResult: CliCommandResult,
  conf: LoadedConfig,
  { view: views }: { view: CliCommand['view'] },
) => {
  if (commandResult === undefined) {
    return
  }

  if (typeof commandResult === 'string') {
    return stdout(commandResult)
  }

  if (Array.isArray(commandResult)) {
    return stdout(commandResult.join('\n'))
  }

  const { result, defaultView } = commandResult
  const view = conf.values.view ?? defaultView

  if (!view || !views?.[view]) {
    return stdout(JSON.stringify(result, null, 2))
  }

  return stdout(
    views[view](
      result && typeof result === 'object' ?
        {
          colors: conf.values.color ? chalk : undefined,
          ...result,
        }
      : result,
    ),
  )
}

export const outputError = (
  e: unknown,
  _conf: LoadedConfig,
  { usage }: { usage: string },
) => {
  process.exitCode ||= 1
  if (isErrorRoot(e)) {
    switch (e.cause.code) {
      case 'EUSAGE': {
        stderr(usage)
        stderr(`Error: ${e.message}`)
        return
      }
    }
  }

  // TODO: handle more error codes and causes
  stderr(e)
}
