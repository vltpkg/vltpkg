import { Chalk } from 'chalk'
import { createSupportsColor } from 'supports-color'
import {
  type CliCommand,
  type CliCommandResult,
  type LoadedConfig,
} from './types.js'
import { type WriteStream } from 'tty'
//
// TODO: make these have log levels etc
// eslint-disable-next-line no-console
export const stdout = (...args: unknown[]) => console.log(...args)
// eslint-disable-next-line no-console
export const stderr = (...args: unknown[]) => console.error(...args)

const getStreamLevel = (stream: WriteStream | null) => {
  // We've already do our own flag sniffing
  const color = createSupportsColor(stream ?? undefined, {
    sniffFlags: false,
  })
  return color === false ? 0 : color.level
}

const getStream = (stream: WriteStream, noColor: boolean) => {
  const level = noColor ? 0 : getStreamLevel(stream)
  return {
    color: level !== 0,
    chalk: new Chalk({ level }),
    isTTY: stream.isTTY,
  }
}

// This uses supports-color to get info on whether the env supports color
// (disregarding tty-ness or argv) since we will do that slightly different.
const getOutputStreams = (conf: LoadedConfig) => {
  const envLevel =
    // supports color does not take NO_COLOR into account
    // https://github.com/chalk/supports-color/issues/105
    'NO_COLOR' in process.env && process.env.NO_COLOR !== '' ?
      0
    : getStreamLevel(null)

  const noColor = envLevel === 0 || conf.get('color') === false

  return {
    stdout: getStream(process.stdout, noColor),
    stderr: getStream(process.stderr, noColor),
  }
}

export const outputCommand = (
  result: CliCommandResult<unknown>,
  conf: LoadedConfig,
  { view: views }: { view?: CliCommand['view'] },
) => {
  if (result === undefined) {
    return
  }

  if (typeof result === 'string') {
    return stdout(result)
  }

  if (Array.isArray(result)) {
    return stdout(result.join('\n'))
  }

  const { chalk, isTTY } = getOutputStreams(conf).stdout

  const view = conf.values.view ?? (isTTY ? 'human' : 'json')
  const viewFn = options.view?.[view]
  const viewResult =
    viewFn ? viewFn(result.result, { colors: chalk }) : result.result

  return stdout(
    typeof viewResult === 'string' ? viewResult : (
      JSON.stringify(viewResult, null, 2)
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
