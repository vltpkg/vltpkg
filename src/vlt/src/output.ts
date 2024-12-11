import chalk from 'chalk'
import {
  type View,
  type LoadedConfig,
  type Views,
  type ViewClass,
  type Command,
  type CommandResult,
} from './types.js'
import { isErrorRoot } from '@vltpkg/error-cause'
import assert from 'node:assert'

// TODO: make these have log levels etc
// eslint-disable-next-line no-console
export const stdout = (...args: unknown[]) => console.log(...args)
// eslint-disable-next-line no-console
export const stderr = (...args: unknown[]) => console.error(...args)

const isViewClass = <T>(view: View<T>): view is ViewClass<T> =>
  typeof view === 'function' && 'prototype' in view

const identity = <T>(x: T): T => x

const getView = (
  conf: LoadedConfig,
  views?: Views,
): [View, (r: unknown) => unknown] => {
  const viewName =
    conf.values.view ??
    (typeof views === 'object' ? views.defaultView : null)

  const viewFn =
    views === undefined ? identity
    : typeof views === 'function' ? views
    : viewName && views.views ? views.views[viewName]
    : identity

  assert(viewFn, `No view found for ${viewName}`)

  return viewName === 'json' ?
      ([viewFn, r => JSON.stringify(r, null, 2)] as const)
    : ([viewFn, identity] as const)
}

export const outputCommand = async (
  cliCommand: Command,
  conf: LoadedConfig,
  { start }: { start: number },
) => {
  const { command, views, usage } = cliCommand

  if (conf.get('help')) {
    return stdout(usage().usage())
  }

  const [view, format] = getView(conf, views)
  const opts = { colors: conf.values.color ? chalk : undefined }

  let onDone: (
    result: CommandResult['result'],
  ) => Promise<void> | void
  let onError: ((err: unknown) => void) | null = null

  if (isViewClass(view)) {
    const viewInstance = new view(opts, conf)
    viewInstance.start()
    onDone = r => viewInstance.done(r, { time: Date.now() - start })
    onError = err => viewInstance.error(err)
  } else {
    onDone = r => stdout(format(view(r, opts, conf)))
  }

  try {
    const result = await command(conf)
    if (result) {
      await onDone(result.result)
    }
  } catch (err) {
    onError?.(err)
    process.exitCode ||= 1

    if (isErrorRoot(err)) {
      switch (err.cause.code) {
        case 'EUSAGE': {
          stderr(usage().usage())
          stderr(`Error: ${err.message}`)
          return
        }
      }
    }

    // TODO: handle more error codes and causes

    stderr(err)
  }
}
