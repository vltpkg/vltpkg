import type { WriteStream } from 'node:tty'
import {
  formatWithOptions,
  styleText as utilStyleText,
} from 'node:util'
import { createSupportsColor } from 'supports-color'
import { defaultView } from './config/definition.ts'
import type { LoadedConfig } from './config/index.ts'
import type { Command } from './index.ts'
import { printErr, formatOptions } from './print-err.ts'
import {
  hasConfiguredRegistry,
  missingRegistryError,
} from './require-registry.ts'
import type { LazyView, View, ViewOptions, Views } from './view.ts'
import { isLazyView, isViewClass, loadLazyView } from './view.ts'
import {
  generateDefaultHelp,
  generateFullHelp,
} from './custom-help.ts'
import {
  flush as flushTelemetry,
  trackCommand,
  trackError,
} from './telemetry.ts'
import { startRequestLog } from './verbose-log.ts'

/* c8 ignore start - CI env detection is a best-effort heuristic */
const isCI = (): boolean =>
  !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.JENKINS_URL ||
    process.env.BUILDKITE ||
    process.env.TRAVIS
  )
/* c8 ignore stop */

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
  utilStyleText(f, s, { validateStream: false })
/* c8 ignore stop */

// TODO: stop exporting mutable variables once exec output is refactored
/* c8 ignore start */
export let styleTextStdout: StyleTextFn = (_, s) => s
export let styleTextStderr: StyleTextFn = (_, s) => s
/* c8 ignore stop */

const identity = <T>(x: T): T => x

const selectView = <T>(
  viewName: string,
  views?: Views<T>,
): View<T> | LazyView<T> | undefined => {
  if (viewName === 'inspect') return identity
  if (viewName === 'silent') return () => undefined
  if (isLazyView<T>(views) || typeof views === 'function') {
    return views
  }
  if (views) return views[viewName]
  return identity
}

export const getView = async <T>(
  conf: LoadedConfig,
  views?: Views<T>,
): Promise<View<T>> => {
  const viewFn = selectView(conf.values.view, views)

  // if the user specified a view that doesn't exist, then set it back to the
  // default, and try again. This will fall back to identity if it's also
  // missing. We also always treat 'json' as a valid view that falls back to
  // identity. This allows the explicit use of `--view=json` to work even
  // when the default view is `human`.
  if (
    !viewFn &&
    conf.values.view !== defaultView &&
    conf.values.view !== 'json' &&
    conf.values.view !== 'silent'
  ) {
    conf.values.view = defaultView
    process.env.VLT_VIEW = defaultView
    return getView(conf, views)
  }

  const resolved = viewFn ?? identity
  if (isLazyView<T>(resolved)) {
    return loadLazyView(resolved)
  }
  return resolved
}

export type OnDone<T> = (result: T) => Promise<unknown>

/**
 * If the view is a View class, then instantiate and start it.
 * If it's a view function, then just define the onDone method.
 */
const startView = async <T>(
  conf: LoadedConfig,
  opts: ViewOptions,
  views?: Views<T>,
  { start }: { start: number } = { start: Date.now() },
): Promise<{
  onDone: OnDone<T>
  onError?: (err: unknown) => void
}> => {
  const View = await getView<T>(conf, views)

  if (isViewClass(View)) {
    const view = new View(opts, conf)
    view.start()
    return {
      async onDone(r) {
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
  { start, vltVersion }: { start: number; vltVersion?: string } = {
    start: Date.now(),
  },
) => {
  const { usage, views, command, needsRegistry } = cliCommand

  const stdoutColor =
    conf.values.color ?? supportsColor(process.stdout)
  const stderrColor =
    conf.values.color ?? supportsColor(process.stderr)

  if (conf.values.help) {
    // Show custom help for main vlt command
    /* c8 ignore start */
    if (conf.command === 'help' && conf.positionals.length === 0) {
      if (conf.get('all')) {
        return stdout(generateFullHelp(stdoutColor))
      }
      return stdout(generateDefaultHelp(stdoutColor))
    }
    /* c8 ignore stop */
    return stdout(usage().usage())
  }

  /* c8 ignore start */
  if (stdoutColor) styleTextStdout = styleText
  if (stderrColor) styleTextStderr = styleText
  /* c8 ignore stop */

  // Stream per-request diagnostics to stderr when `--loglevel` is verbose
  // or higher (e.g. via `--verbose`). No-op otherwise.
  const stopRequestLog = startRequestLog(
    conf.values.loglevel,
    line => stderr(line),
    styleTextStderr,
  )

  const { onDone, onError } = await startView(
    conf,
    // assume views will always output to stdout so use color support from there
    { colors: stdoutColor },
    views,
    { start },
  )

  const telemetryEnabled = conf.values.telemetry
  const commandName = conf.command

  try {
    // checked here rather than in run() so that the missing-registry
    // error is rendered, tracked and exited like any other command
    // error, and so that the `--help` return above still works when
    // nothing is configured.
    if (needsRegistry && !hasConfiguredRegistry(conf)) {
      throw missingRegistryError()
    }

    const output = await onDone(await command(conf))
    stopRequestLog()

    const duration_ms = Date.now() - start
    trackCommand(
      {
        command: commandName,
        duration_ms,
        success: true,
        node_version: process.version,
        vlt_version: vltVersion ?? 'unknown',
        os: process.platform,
        arch: process.arch,
        ci: isCI(),
      },
      telemetryEnabled,
    )

    if (output !== undefined && conf.values.view !== 'silent') {
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

    // Await the flush so pending telemetry events are sent before
    // the process exits.  The flush has a built-in timeout cap
    // (SHUTDOWN_TIMEOUT_MS) so it will never block for long, and the
    // timer is unreffed so even if this is not awaited the process
    // can still exit promptly.
    await flushTelemetry()
  } catch (err) {
    stopRequestLog()
    onError?.(err)
    process.exitCode ||= 1

    const duration_ms = Date.now() - start
    trackCommand(
      {
        command: commandName,
        duration_ms,
        success: false,
        node_version: process.version,
        vlt_version: vltVersion ?? 'unknown',
        os: process.platform,
        arch: process.arch,
        ci: isCI(),
      },
      telemetryEnabled,
    )

    const errorCode =
      (
        err instanceof Error &&
        err.cause &&
        typeof err.cause === 'object' &&
        'code' in err.cause &&
        typeof err.cause.code === 'string'
      ) ?
        err.cause.code
      : undefined
    trackError(
      {
        command: commandName,
        error_code: errorCode,
      },
      telemetryEnabled,
    )

    await flushTelemetry()

    printErr(err, usage, stderr, {
      ...formatOptions,
      colors: stderrColor,
    })

    process.exit(process.exitCode)
  }
}
