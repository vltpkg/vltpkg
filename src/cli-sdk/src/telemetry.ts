/**
 * Telemetry module for vlt CLI.
 *
 * Initializes Sentry error tracking unless the user has opted out.
 *
 * Opt-out methods (any one is sufficient):
 * - `DO_NOT_TRACK=1` environment variable
 *   (https://consoledonottrack.com/)
 * - `--no-telemetry` CLI flag
 * - `"telemetry": false` in vlt.json config
 * @module
 */

import * as Sentry from '@sentry/node'

const SENTRY_DSN =
  'https://2e3737e1a74cd7d363b280c482596d8e@o4506397716054016.ingest.us.sentry.io/4511118387707904'

/**
 * Returns true if telemetry is disabled via environment variable.
 *
 * Checks `DO_NOT_TRACK` following the Console Do Not Track
 * convention.
 */
export const isDoNotTrack = (): boolean =>
  process.env.DO_NOT_TRACK === '1' ||
  process.env.DO_NOT_TRACK === 'true'

let sentryActive = false
let didInit = false

/**
 * Initialize telemetry (Sentry error tracking).
 *
 * This should be called as early as possible in the CLI
 * lifecycle so that unhandled exceptions are captured.
 * If `DO_NOT_TRACK` is set, this is a no-op.
 * @param {string} version - The CLI version string.
 */
export const initTelemetry = (version?: string): void => {
  if (didInit) return
  didInit = true

  if (isDoNotTrack()) return

  Sentry.init({
    dsn: SENTRY_DSN,
    release: version ? `vlt@${version}` : undefined,
    sendDefaultPii: true,
  })
  sentryActive = true
}

/**
 * Disable telemetry after it was already initialized.
 *
 * Called when config/CLI flags indicate `--no-telemetry`
 * but the env var was not set (so Sentry was started
 * eagerly). This closes the Sentry client so no further
 * events are sent.
 */
export const disableTelemetry = (): void => {
  const client = Sentry.getClient()
  if (client) {
    void client.close(0)
  }
  sentryActive = false
}

/**
 * Flush pending Sentry events before process exit.
 *
 * Returns a promise that resolves when events are sent
 * (or after the timeout expires).
 */
export const flushTelemetry = async (
  timeoutMs = 2000,
): Promise<void> => {
  if (!sentryActive) return
  await Sentry.flush(timeoutMs)
}

// ---------------------------------------------------------------------------
// Event-tracking stubs
//
// The PostHog telemetry module exposed trackCommand / trackInstall /
// trackError for explicit analytics events.  Sentry captures errors
// automatically, so these are intentional no-ops — we keep the
// exports so that call-sites in output.ts / install.ts compile
// without changes.
// ---------------------------------------------------------------------------

export interface CommandEvent {
  command: string
  duration_ms: number
  success: boolean
  node_version: string
  vlt_version: string
  os: string
  arch: string
  ci: boolean
}

export interface InstallEvent {
  dependency_count: number
  duration_ms: number
}

export interface ErrorEvent {
  command: string
  error_code?: string
}

/** No-op — Sentry captures errors automatically. */
export const trackCommand = (
  _ev: CommandEvent,
  _telemetryFlag?: boolean,
): void => {}

/** No-op — Sentry captures errors automatically. */
export const trackInstall = (
  _ev: InstallEvent,
  _telemetryFlag?: boolean,
): void => {}

/** No-op — Sentry captures errors automatically. */
export const trackError = (
  _ev: ErrorEvent,
  _telemetryFlag?: boolean,
): void => {}
