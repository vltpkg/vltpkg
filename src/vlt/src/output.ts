import chalk from 'chalk'
import {
  type View,
  type CliCommandResult,
  type LoadedConfig,
} from './types.js'

// TODO: make these have log levels etc
// eslint-disable-next-line no-console
export const stdout = (...args: unknown[]) => console.log(...args)
// eslint-disable-next-line no-console
export const stderr = (...args: unknown[]) => console.error(...args)

export const outputCommand = (
  commandResult: CliCommandResult,
  conf: LoadedConfig,
  view?: View,
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

  const { result } = commandResult

  if (!view) {
    return stdout(JSON.stringify(result, null, 2))
  }

  if (view.renderer === 'ink') {
    return
  }

  return stdout(
    view.fn(
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
  if (
    e instanceof Error &&
    e.cause &&
    typeof e.cause === 'object' &&
    'code' in e.cause
  ) {
    if (e.cause.code === 'EUSAGE') {
      stderr(usage)
      stderr(`Error: ${e.message}`)
      return
    }
  }
  // TODO: handle more error codes and causes
  stderr(e)
}
