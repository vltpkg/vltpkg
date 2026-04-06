/**
 * Anonymized telemetry for the vlt CLI.
 *
 * - Sends anonymous, non-PII events to PostHog.
 * - Generates a random UUID on first run, stored in XDG data dir.
 * - Respects opt-out via `DO_NOT_TRACK=1`, `VLT_TELEMETRY=0`,
 *   or the `--telemetry=false` config flag.
 * - Never blocks CLI exit — flush is fire-and-forget with a timeout.
 * - Fails silently on any network or runtime error.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { XDG } from '@vltpkg/xdg'

const POSTHOG_API_KEY =
  'phc_k9xCAgC6sPIBLb5UhjhnGWpt1mos0hLV4mmEhZTGPpO'
const POSTHOG_HOST = 'https://us.i.posthog.com'

/** Timeout (ms) we wait for PostHog to flush before giving up. */
const SHUTDOWN_TIMEOUT_MS = 2_000

const xdg = new XDG('vlt')

/**
 * Check whether telemetry is disabled via environment variables.
 *
 * - `DO_NOT_TRACK=1` — https://consoledonottrack.com/
 * - `VLT_TELEMETRY=0`
 */
export const isOptedOut = (): boolean =>
  process.env.DO_NOT_TRACK === '1' ||
  process.env.VLT_TELEMETRY === '0'

/**
 * Return (or create) a stable anonymous distinct ID.
 * Stored at `<XDG_DATA_HOME>/vlt/telemetry-id`.
 */
const getAnonymousId = (): string => {
  const dir = xdg.data()
  const file = xdg.data('telemetry-id')
  try {
    const existing = readFileSync(file, 'utf8').trim()
    if (existing) return existing
  } catch {
    // file doesn't exist yet — create it below
  }
  const id = randomUUID()
  try {
    mkdirSync(dir, { recursive: true })
    writeFileSync(file, id + '\n')
  } catch {
    // best-effort — if we can't persist, just use a transient id
  }
  return id
}

// ---------------------------------------------------------------------------
// PostHog client — lazily initialised
// ---------------------------------------------------------------------------

let _posthog: PostHogClient | undefined
let _initFailed = false

// We define a minimal interface so that the module compiles even when
// posthog-node is not installed (e.g. in tests that mock this module).
interface PostHogClient {
  capture(event: {
    distinctId: string
    event: string
    properties?: Record<string, unknown>
  }): void
  shutdownAsync(): Promise<void>
}

const getClient = (): PostHogClient | undefined => {
  if (_posthog) return _posthog
  if (_initFailed) return undefined
  try {
    // Dynamic import would be async; posthog-node also ships a
    // synchronous constructor, so we use createRequire to keep
    // the hot-path synchronous in this ESM package.
    const req = createRequire(import.meta.url)
    const { PostHog } = req('posthog-node') as {
      PostHog: new (
        key: string,
        opts: {
          host: string
          flushAt: number
          flushInterval: number
        },
      ) => PostHogClient
    }
    _posthog = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      // Buffer up to 20 events and flush every 10 s — but we always
      // call shutdownAsync at the end so this is just a safety net.
      flushAt: 20,
      flushInterval: 10_000,
    })
    return _posthog
    /* c8 ignore next 4 */
  } catch {
    _initFailed = true
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Public API
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

/**
 * Capture a `cli_command` event.
 */
export const trackCommand = (
  ev: CommandEvent,
  telemetryFlag?: boolean,
): void => {
  if (telemetryFlag === false || isOptedOut()) return
  const ph = getClient()
  if (!ph) return
  try {
    ph.capture({
      distinctId: getAnonymousId(),
      event: 'cli_command',
      properties: { ...ev },
    })
  } catch {
    // fail silently
  }
}

/**
 * Capture a `cli_install` event.
 */
export const trackInstall = (
  ev: InstallEvent,
  telemetryFlag?: boolean,
): void => {
  if (telemetryFlag === false || isOptedOut()) return
  const ph = getClient()
  if (!ph) return
  try {
    ph.capture({
      distinctId: getAnonymousId(),
      event: 'cli_install',
      properties: { ...ev },
    })
  } catch {
    // fail silently
  }
}

/**
 * Capture a `cli_error` event.
 */
export const trackError = (
  ev: ErrorEvent,
  telemetryFlag?: boolean,
): void => {
  if (telemetryFlag === false || isOptedOut()) return
  const ph = getClient()
  if (!ph) return
  try {
    ph.capture({
      distinctId: getAnonymousId(),
      event: 'cli_error',
      properties: { ...ev },
    })
  } catch {
    // fail silently
  }
}

/**
 * Flush pending events. Returns a promise that resolves once flushing
 * completes **or** when `SHUTDOWN_TIMEOUT_MS` elapses — whichever
 * comes first. Never rejects.
 */
export const flush = (): Promise<void> => {
  const ph = _posthog
  if (!ph) return Promise.resolve()
  return Promise.race([
    ph.shutdownAsync().catch(() => {}),
    new Promise<void>(r => setTimeout(r, SHUTDOWN_TIMEOUT_MS)),
  ])
}
