import * as Sentry from '@sentry/node'

/**
 * Telemetry module for logging and performance tracking.
 * All functions are no-ops when telemetry is disabled.
 *
 * Reads configuration from environment variables:
 * - SENTRY_DSN: The Sentry DSN for error and performance tracking
 * - SENTRY_ENVIRONMENT: The environment name (e.g., 'production', 'staging')
 * - VSR_PLATFORM: Used as a tag for identifying the deployment platform
 */

const {
  SENTRY_DSN = '',
  SENTRY_ENVIRONMENT = 'development',
  VSR_PLATFORM = 'node',
  VSR_TELEMETRY = 'false',
} = process.env

const isEnabled = VSR_TELEMETRY === 'true' && !!SENTRY_DSN

let initialized = false

/**
 * Initialize telemetry. Should be called once at app startup.
 * No-op if telemetry is disabled or already initialized.
 */
export function initTelemetry(): void {
  if (!isEnabled || initialized) return
  initialized = true

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    integrations: [Sentry.httpIntegration()],
    initialScope: {
      tags: {
        platform: VSR_PLATFORM,
      },
    },
  })
}

// ============================================================================
// Logging
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warning' | 'error'

/**
 * Log a message with optional data. Goes to Sentry as breadcrumb when enabled,
 * otherwise falls back to console.
 */
export function log(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (isEnabled) {
    Sentry.addBreadcrumb({
      category: 'vsr',
      message,
      level,
      data,
    })
  }
  const consoleMethod =
    level === 'debug' ? 'log'
    : level === 'warning' ? 'warn'
    : level
  console[consoleMethod](
    `[${level}]`,
    message,
    data ? JSON.stringify(data) : '',
  )
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) =>
    log('debug', message, data),
  info: (message: string, data?: Record<string, unknown>) =>
    log('info', message, data),
  warn: (message: string, data?: Record<string, unknown>) =>
    log('warning', message, data),
  error: (message: string, data?: Record<string, unknown>) =>
    log('error', message, data),
}

/**
 * Capture an exception to Sentry with optional context.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (isEnabled) {
    Sentry.captureException(error, { extra: context })
  }
  console.error('[exception]', error, context)
}

// ============================================================================
// Performance Tracking - Spans
// ============================================================================

export type SpanOp =
  | 'db.read'
  | 'db.write'
  | 'storage.read'
  | 'storage.write'
  | 'cache.check'
  | 'cache.hit'
  | 'cache.miss'
  | 'cache.set'
  | 'http.fetch'
  | 'http.request'

export interface SpanAttributes {
  /** Name of the package being operated on */
  'package.name'?: string
  /** Version of the package */
  'package.version'?: string
  /** Origin registry (e.g., 'npm') */
  'registry.origin'?: string
  /** Type of resource (packument, version, tarball) */
  'resource.type'?: 'packument' | 'version' | 'tarball'
  /** Whether this was a cache hit */
  'cache.hit'?: boolean
  /** Whether the cached data was stale */
  'cache.stale'?: boolean
  /** Database dialect in use */
  'db.dialect'?: 'sqlite' | 'neon' | 'pg'
  /** Storage type in use */
  'storage.type'?: 'fs' | 'r2' | 's3'
  /** HTTP method */
  'http.method'?: string
  /** HTTP URL */
  'http.url'?: string
  /** HTTP status code */
  'http.status_code'?: number
  /** Size in bytes */
  'data.size'?: number
  /** Any additional custom attributes */
  [key: string]: string | number | boolean | undefined
}

type SpanAttributeRecord = Record<
  string,
  string | number | boolean | undefined
>

/**
 * Convert SpanAttributes to a simple record, filtering out undefined values.
 */
function toSpanAttributes(
  attrs?: SpanAttributes,
): SpanAttributeRecord {
  if (!attrs) return {}
  const result: SpanAttributeRecord = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result
}

export interface SpanContext {
  end: () => void
  setAttributes: (attrs: SpanAttributes) => void
  setStatus: (status: 'ok' | 'error', message?: string) => void
}

/**
 * Start a performance span for tracking operation timing.
 * Returns an object with end() to complete the span.
 * When telemetry is disabled, still logs operation timing to console.
 *
 * Example:
 * ```ts
 * const span = startSpan('db.read', 'get_packument', { 'package.name': 'lodash' })
 * try {
 *   const result = await db.query(...)
 *   span.end()
 *   return result
 * } catch (err) {
 *   span.setStatus('error', err.message)
 *   span.end()
 *   throw err
 * }
 * ```
 */
export function startSpan(
  op: SpanOp,
  name: string,
  attributes?: SpanAttributes,
): SpanContext {
  if (!isEnabled) {
    const start = performance.now()
    let status: 'ok' | 'error' = 'ok'
    let errorMessage: string | undefined

    return {
      end: () => {
        const duration = performance.now() - start
        if (status === 'error') {
          console.error(
            `[${op}] ${name} failed after ${duration.toFixed(2)}ms${errorMessage ? `: ${errorMessage}` : ''}`,
          )
        } else {
          console.log(
            `[${op}] ${name} completed in ${duration.toFixed(2)}ms`,
          )
        }
      },
      setAttributes: () => {},
      setStatus: (s: 'ok' | 'error', message?: string) => {
        status = s
        errorMessage = message
      },
    }
  }

  const span = Sentry.startInactiveSpan({
    op,
    name,
    attributes: toSpanAttributes(attributes),
  })

  return {
    end: () => span.end(),
    setAttributes: (attrs: SpanAttributes) => {
      for (const [key, value] of Object.entries(attrs)) {
        if (value !== undefined) {
          span.setAttribute(key, value)
        }
      }
    },
    setStatus: (s: 'ok' | 'error', message?: string) => {
      span.setStatus({
        code: s === 'ok' ? 1 : 2,
        message,
      })
    },
  }
}

/**
 * Wrap an async function in a span for automatic timing and error capture.
 * When telemetry is disabled, still logs operation timing to console.
 *
 * Example:
 * ```ts
 * const result = await withSpan('db.read', 'get_packument', { 'package.name': 'lodash' }, async () => {
 *   return await db.query(...)
 * })
 * ```
 */
export async function withSpan<T>(
  op: SpanOp,
  name: string,
  attributes: SpanAttributes,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isEnabled) {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - start
      console.log(
        `[${op}] ${name} completed in ${duration.toFixed(2)}ms`,
      )
      return result
    } catch (err) {
      const duration = performance.now() - start
      console.error(
        `[${op}] ${name} failed after ${duration.toFixed(2)}ms:`,
        err instanceof Error ? err.message : err,
      )
      throw err
    }
  }

  return Sentry.startSpan(
    {
      op,
      name,
      attributes: toSpanAttributes(attributes),
    },
    async (span: Sentry.Span) => {
      try {
        const result = await fn()
        span.setStatus({ code: 1 }) // OK
        return result
      } catch (err) {
        span.setStatus({
          code: 2, // ERROR
          message: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
    },
  )
}

/**
 * Wrap a sync function in a span for automatic timing and error capture.
 * When telemetry is disabled, still logs operation timing to console.
 */
export function withSpanSync<T>(
  op: SpanOp,
  name: string,
  attributes: SpanAttributes,
  fn: () => T,
): T {
  if (!isEnabled) {
    const start = performance.now()
    try {
      const result = fn()
      const duration = performance.now() - start
      console.log(
        `[${op}] ${name} completed in ${duration.toFixed(2)}ms`,
      )
      return result
    } catch (err) {
      const duration = performance.now() - start
      console.error(
        `[${op}] ${name} failed after ${duration.toFixed(2)}ms:`,
        err instanceof Error ? err.message : err,
      )
      throw err
    }
  }

  return Sentry.startSpanManual(
    {
      op,
      name,
      attributes: toSpanAttributes(attributes),
    },
    (span: Sentry.Span) => {
      try {
        const result = fn()
        span.setStatus({ code: 1 }) // OK
        span.end()
        return result
      } catch (err) {
        span.setStatus({
          code: 2, // ERROR
          message: err instanceof Error ? err.message : String(err),
        })
        span.end()
        throw err
      }
    },
  )
}

// ============================================================================
// Request Transaction Wrapper
// ============================================================================

/**
 * Start a transaction for an HTTP request. Call this at the beginning of
 * request handling to create a parent span that child spans will attach to.
 * When telemetry is disabled, still logs request duration to console.
 */
export function startRequestTransaction(
  method: string,
  path: string,
  attributes?: SpanAttributes,
): SpanContext {
  const name = `${method} ${path}`

  if (!isEnabled) {
    const start = performance.now()
    let status: 'ok' | 'error' = 'ok'
    let errorMessage: string | undefined

    return {
      end: () => {
        const duration = performance.now() - start
        if (status === 'error') {
          console.error(
            `[http.request] ${name} failed after ${duration.toFixed(2)}ms${errorMessage ? `: ${errorMessage}` : ''}`,
          )
        } else {
          console.log(
            `[http.request] ${name} completed in ${duration.toFixed(2)}ms`,
          )
        }
      },
      setAttributes: () => {},
      setStatus: (s: 'ok' | 'error', message?: string) => {
        status = s
        errorMessage = message
      },
    }
  }

  const span = Sentry.startInactiveSpan({
    op: 'http.request',
    name,
    forceTransaction: true,
    attributes: toSpanAttributes({
      'http.method': method,
      'http.url': path,
      ...attributes,
    }),
  })

  return {
    end: () => span.end(),
    setAttributes: (attrs: SpanAttributes) => {
      for (const [key, value] of Object.entries(attrs)) {
        if (value !== undefined) {
          span.setAttribute(key, value)
        }
      }
    },
    setStatus: (s: 'ok' | 'error', message?: string) => {
      span.setStatus({
        code: s === 'ok' ? 1 : 2,
        message,
      })
    },
  }
}

// ============================================================================
// Convenience helpers for common operations
// ============================================================================

interface CacheSpanOptions {
  packageName: string
  version?: string
  origin: string
  resourceType: 'packument' | 'version' | 'tarball'
  dialect?: 'sqlite' | 'neon' | 'pg'
}

/**
 * Create a span for a database read operation.
 */
export async function withDbRead<T>(
  name: string,
  options: CacheSpanOptions,
  fn: () => Promise<T>,
): Promise<T> {
  return withSpan(
    'db.read',
    name,
    {
      'package.name': options.packageName,
      'package.version': options.version,
      'registry.origin': options.origin,
      'resource.type': options.resourceType,
      'db.dialect': options.dialect,
    },
    fn,
  )
}

/**
 * Create a span for a database write operation.
 */
export async function withDbWrite<T>(
  name: string,
  options: CacheSpanOptions,
  fn: () => Promise<T>,
): Promise<T> {
  return withSpan(
    'db.write',
    name,
    {
      'package.name': options.packageName,
      'package.version': options.version,
      'registry.origin': options.origin,
      'resource.type': options.resourceType,
      'db.dialect': options.dialect,
    },
    fn,
  )
}

/**
 * Create a span for a storage read operation.
 */
export async function withStorageRead<T>(
  name: string,
  options: CacheSpanOptions & { storageType?: 'fs' | 'r2' | 's3' },
  fn: () => Promise<T>,
): Promise<T> {
  return withSpan(
    'storage.read',
    name,
    {
      'package.name': options.packageName,
      'package.version': options.version,
      'registry.origin': options.origin,
      'resource.type': options.resourceType,
      'storage.type': options.storageType,
    },
    fn,
  )
}

/**
 * Create a span for a storage write operation.
 */
export async function withStorageWrite<T>(
  name: string,
  options: CacheSpanOptions & { storageType?: 'fs' | 'r2' | 's3' },
  fn: () => Promise<T>,
): Promise<T> {
  return withSpan(
    'storage.write',
    name,
    {
      'package.name': options.packageName,
      'package.version': options.version,
      'registry.origin': options.origin,
      'resource.type': options.resourceType,
      'storage.type': options.storageType,
    },
    fn,
  )
}

/**
 * Create a span for an HTTP fetch to upstream registry.
 */
export async function withFetch<T>(
  url: string,
  fn: () => Promise<T>,
): Promise<T> {
  return withSpan(
    'http.fetch',
    `fetch ${url}`,
    {
      'http.url': url,
      'http.method': 'GET',
    },
    fn,
  )
}

/**
 * Log a cache hit event with timing data for aggregation.
 */
export function logCacheHit(
  resourceType: 'packument' | 'version' | 'tarball',
  packageName: string,
  options: { stale: boolean; version?: string; origin: string },
): void {
  logger.info(`cache_hit:${resourceType}`, {
    'package.name': packageName,
    'package.version': options.version,
    'registry.origin': options.origin,
    'cache.stale': options.stale,
  })
}

/**
 * Log a cache miss event for aggregation.
 */
export function logCacheMiss(
  resourceType: 'packument' | 'version' | 'tarball',
  packageName: string,
  options: { version?: string; origin: string },
): void {
  logger.info(`cache_miss:${resourceType}`, {
    'package.name': packageName,
    'package.version': options.version,
    'registry.origin': options.origin,
  })
}
