import {
  formatWithOptions,
  styleText as utilStyleText,
} from 'node:util'
import type { InspectOptions } from 'node:util'
import { defaultView } from './config/definition.ts'
import type { LoadedConfig } from './config/index.ts'
import type { Command } from './index.ts'
import { printErr } from './print-err.ts'
import type { View, ViewOptions, Views } from './view.ts'
import { isViewClass } from './view.ts'
import { createSupportsColor } from 'supports-color'
import type { WriteStream } from 'node:tty'

const supportsColor = (stream: WriteStream) => {
  const res = createSupportsColor(stream, { sniffFlags: false })
  if (res === false) return false
  /* c8 ignore next */
  return res.level > 0
}

// eslint-disable-next-line no-console
export const stdout = (...args: unknown[]) => console.log(...args)
// eslint-disable-next-line no-console
export const stderr = (...args: unknown[]) => console.error(...args)

type StyleTextFn = (
  format: Parameters<typeof utilStyleText>[0],
  s: string,
) => string

/* c8 ignore start */
const styleText: StyleTextFn = (f, s) =>
  // @ts-expect-error -- styleText 3rd argument is not in types/node
  utilStyleText(f, s, { validateStream: false })
/* c8 ignore stop */

// TODO: stop exporting mutable variables once exec output is refactored
/* c8 ignore start */
export let styleTextStdout: StyleTextFn = (_, s) => s
export let styleTextStderr: StyleTextFn = (_, s) => s
/* c8 ignore stop */

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
const startView = <T>(
  conf: LoadedConfig,
  opts: ViewOptions,
  views?: Views<T>,
  { start }: { start: number } = { start: Date.now() },
): {
  onDone: OnDone<T>
  onError?: (err: unknown) => void
} => {
  const View = getView<T>(conf, views)

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

  if (conf.values.help) {
    return stdout(usage().usage())
  }

  const stdoutColor =
    conf.values.color ?? supportsColor(process.stdout)
  const stderrColor =
    conf.values.color ?? supportsColor(process.stderr)

  /* c8 ignore start */
  if (stdoutColor) styleTextStdout = styleText
  if (stderrColor) styleTextStderr = styleText
  /* c8 ignore stop */

  const formatOptions = {
    depth: Infinity,
    maxArrayLength: Infinity,
    maxStringLength: Infinity,
  } as const satisfies InspectOptions

  const { onDone, onError } = startView(
    conf,
    // assume views will always output to stdout so use color support from there
    { colors: stdoutColor },
    views,
    { start },
  )

  try {
    const output = await onDone(await command(conf))
    if (output !== undefined) {
      stdout(
        conf.values.view === 'json' ?
          JSON.stringify(output, null, 2)
        : formatWithOptions(
            {
              ...formatOptions,
              colors: stdoutColor,
            },
            output,
          ),
      )
    }
  } catch (err) {
    onError?.(err)
    process.exitCode ||= 1

    printErr(err, usage, stderr, {
      ...formatOptions,
      colors: stderrColor,
    })

    process.exit(process.exitCode)
  }
}
