import { emitter } from '@vltpkg/output'
import type { Events } from '@vltpkg/output'

/**
 * Diagnostic logging levels, ordered from least to most verbose.
 * Mirrors the `loglevel` option in the config definition.
 */
export type LogLevel =
  'silent' | 'error' | 'warn' | 'info' | 'verbose' | 'debug'

const rank: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  verbose: 4,
  debug: 5,
}

/** True when the given level should emit per-request logging. */
export const isVerbose = (level: LogLevel): boolean =>
  rank[level] >= rank.verbose

const isDebug = (level: LogLevel): boolean =>
  rank[level] >= rank.debug

/** The subset of `styleText` color names this module applies. */
export type StyleColor = 'green' | 'red' | 'gray'

/**
 * Minimal signature compatible with the `styleText` helpers exported by
 * `./output.ts` (which accept a wider set of format names). Defaults to an
 * identity function so this module can be tested without color support.
 */
export type StyleFn = (format: StyleColor, s: string) => string

const identityStyle: StyleFn = (_f, s) => s

const tagStyle = (
  state: Events['request']['state'],
  statusCode: number | undefined,
): StyleColor => {
  switch (state) {
    case 'cache':
    case 'stale':
    case '304':
      return 'green'
    case 'start':
      return 'gray'
    case 'complete':
      return statusCode !== undefined && statusCode >= 400 ?
          'red'
        : 'green'
  }
}

/**
 * Format a single `request` event into a human-readable log line.
 * Exported for testing.
 */
export const formatRequestEvent = (
  event: Events['request'],
  style: StyleFn = identityStyle,
): string => {
  const { url, state, method = 'GET', statusCode, durationMs } = event
  // For completed network requests show the status code rather than the
  // literal word "complete"; everything else shows the cache/fetch state.
  const tag = state === 'complete' ? String(statusCode ?? '') : state
  const duration =
    durationMs === undefined ? '' : (
      style('gray', ` (${durationMs}ms)`)
    )
  return `${style(tagStyle(state, statusCode), tag.padEnd(8))} ${method} ${String(url)}${duration}`
}

/**
 * Subscribe to registry request events and stream them to `write` when
 * the configured `level` is `verbose` or higher. The `start` event is only
 * logged at `debug` level to avoid duplicate lines (each network request
 * also emits a `complete`/`304` line with its status and duration).
 *
 * Returns a cleanup function that detaches the subscription. When `level`
 * is below `verbose`, nothing is subscribed and the cleanup is a no-op.
 */
export const startRequestLog = (
  level: LogLevel,
  write: (line: string) => void,
  style: StyleFn = identityStyle,
): (() => void) => {
  if (!isVerbose(level)) return () => {}
  const debug = isDebug(level)
  const handler = (event: Events['request']) => {
    // At verbose level, skip the `start` event so each request produces a
    // single completion line; at debug level, show it too.
    if (event.state === 'start' && !debug) return
    write(formatRequestEvent(event, style))
  }
  emitter.on('request', handler)
  return () => emitter.off('request', handler)
}
