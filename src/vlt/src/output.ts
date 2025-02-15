import chalk from 'chalk'
import type {
  View,
  LoadedConfig,
  Views,
  ViewClass,
  Command,
  CommandResult,
} from './types.ts'
import { isErrorRoot } from '@vltpkg/error-cause'
import assert from 'node:assert'

// TODO: make these have log levels etc
// eslint-disable-next-line no-console
export const stdout = (...args: unknown[]) => console.log(...args)
// eslint-disable-next-line no-console
export const stderr = (...args: unknown[]) => console.error(...args)

const isViewClass = <T>(view: View<T>): view is ViewClass<T> =>
  typeof view === 'function' &&
  'prototype' in view &&
  'start' in view.prototype &&
  'done' in view.prototype &&
  'error' in view.prototype

const identity = <T>(x: T): T => x

const getView = <T>(
  conf: LoadedConfig,
  views?: Views<T>,
): { view: View<T>; isJson: boolean } => {
  const viewName =
    conf.values.view ??
    (typeof views === 'object' ? views.defaultView : null)

  const viewFn =
    views === undefined ? identity
    : typeof views === 'function' ? views
    : viewName && views.views ? views.views[viewName]
    : identity

  assert(viewFn, `No view found for ${viewName}`)

  return {
    view: viewFn,
    isJson: viewName === 'json',
  }
}

export const outputCommand = async <T>(
  cliCommand: Command<T>,
  conf: LoadedConfig,
  { start }: { start?: number } = {},
) => {
  const { command, views, usage } = cliCommand

  if (conf.get('help')) {
    return stdout(usage().usage())
  }

  const { view, isJson } = getView(conf, views)
  const opts = { colors: conf.values.color ? chalk : undefined }

  let onDone: (result: CommandResult<T>) => void
  let onError: ((err: unknown) => void) | null = null

  if (isViewClass(view)) {
    const viewInstance = new view(opts, conf)
    viewInstance.start()
    onDone = r =>
      viewInstance.done(r, { time: start ? Date.now() - start : 0 })
    onError = err => viewInstance.error(err)
  } else {
    onDone = r => {
      if (r === undefined) {
        return
      }
      const res = view(r.result, opts, conf)
      return isJson ? JSON.stringify(res, null, 2) : res
    }
  }

  try {
    const output = onDone(await command(conf))
    if (output !== undefined) {
      stdout(output)
    }
  } catch (err) {
    onError?.(err)
    process.exitCode ||= 1

    if (isErrorRoot(err)) {
      switch (err.cause.code) {
        // TODO: handle more error codes and causes
        case 'EUSAGE': {
          stderr(usage().usage())
          stderr(`Error: ${err.message}`)
          if (err.cause.found) {
            stderr(`  Found: ${err.cause.found}`)
          }
          if (err.cause.validOptions) {
            stderr(
              `  Valid options: ${err.cause.validOptions.join(', ')}`,
            )
          }
          return
        }
      }
    }

    stderr(err)
  }
}
