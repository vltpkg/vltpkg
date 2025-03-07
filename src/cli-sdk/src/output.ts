import chalk from 'chalk'
import { formatWithOptions } from 'node:util'
import type { InspectOptions } from 'node:util'
import { defaultView } from './config/definition.ts'
import type { LoadedConfig } from './config/index.ts'
import type { Command } from './index.ts'
import { printErr } from './print-err.ts'
import type { View, Views } from './view.ts'
import { isViewClass } from './view.ts'

// TODO: make these have log levels etc
// eslint-disable-next-line no-console
export const stdout = (...args: unknown[]) => console.log(...args)
// eslint-disable-next-line no-console
export const stderr = (...args: unknown[]) => console.error(...args)

const identity = <T>(x: T): T => x

export const getView = <T>(
  conf: LoadedConfig,
  views?: Views<T>,
): View<T> => {
  const viewName = conf.values.view

  const viewFn =
    viewName === 'inspect' ? identity
    : typeof views === 'function' ? views
    : views && typeof views === 'object' ? views[viewName]
    : identity

  // if the user specified a view that doesn't exist,
  // then set it back to the default, and try again.
  // This will fall back to identity if it's also missing.
  if (!viewFn && conf.values.view !== defaultView) {
    conf.values.view = defaultView
    process.env.VLT_VIEW = defaultView
    return getView(conf, views)
  }

  return viewFn ?? identity
}

export type OnDone<T> =
  | ((result: T) => Promise<unknown>)
  | ((result: T) => unknown)

/**
 * If the view is a View class, then instantiate and start it.
 * If it's a view function, then just define the onDone method.
 */
export const startView = <T>(
  conf: LoadedConfig,
  views?: Views<T>,
  { start = Date.now() }: { start?: number } = {},
): {
  onDone: OnDone<T>
  onError?: (err: unknown) => void
} => {
  const View = getView<T>(conf, views)

  const opts = {
    colors: conf.values.color ? chalk : undefined,
  }

  if (isViewClass(View)) {
    const view = new View(opts, conf)
    view.start()
    return {
      onDone(r) {
        return view.done(r, { time: Date.now() - start })
      },
      onError(err) {
        view.error(err)
      },
    }
  }

  return {
    async onDone(r) {
      if (r === undefined) return
      return View(r, opts, conf)
    },
  }
}

/**
 * Main export. Run the command appropriately, displaying output using
 * the user-requested view, or the default if the user requested a view
 * that is not defined for this command.
 */
export const outputCommand = async <T>(
  cliCommand: Command<T>,
  conf: LoadedConfig,
  { start }: { start: number } = { start: Date.now() },
) => {
  const { usage, views, command } = cliCommand
  if (conf.get('help')) {
    return stdout(usage().usage())
  }

  const formatOptions = {
    colors: conf.values.color,
    depth: Infinity,
    maxArrayLength: Infinity,
    maxStringLength: Infinity,
  } as const satisfies InspectOptions

  const { onDone, onError } = startView(conf, views, { start })

  try {
    const output = await onDone(await command(conf))
    if (output !== undefined) {
      stdout(
        conf.values.view === 'json' ?
          JSON.stringify(output, null, 2)
        : formatWithOptions(formatOptions, output),
      )
    }
  } catch (err) {
    onError?.(err)
    process.exitCode ||= 1

    printErr(err, usage, stderr, formatOptions)

    process.exit(process.exitCode)
  }
}
