import { sentry } from '@hono/sentry'
import type { Context } from 'hono'
import type { HonoContext } from '../../types.ts'

/**
 * Telemetry middleware that conditionally applies Sentry based on configuration
 * Relies on configMiddleware to have already enriched c.env with TELEMETRY_ENABLED
 */
export async function telemetryMiddleware(
  c: HonoContext,
  next: () => Promise<void>,
) {
  // Check if telemetry is enabled via the enriched config
  if (c.env.TELEMETRY_ENABLED) {
    // Apply Sentry middleware dynamically
    const sentryMiddleware = sentry({
      dsn: c.env.SENTRY?.dsn ?? c.env.SENTRY_CONFIG?.dsn ?? '',
      environment:
        c.env.SENTRY?.environment ??
        c.env.SENTRY_CONFIG?.environment ??
        'development',
      sendDefaultPii: c.env.SENTRY_CONFIG?.sendDefaultPii ?? true,
      sampleRate: c.env.SENTRY_CONFIG?.sampleRate ?? 1.0,
      tracesSampleRate: c.env.SENTRY_CONFIG?.tracesSampleRate ?? 0.1,
      beforeSend(event, _hint) {
        // Filter out expected errors to reduce noise
        if (
          event.exception?.values?.[0]?.value?.includes('404') ||
          event.exception?.values?.[0]?.value?.includes('not found')
        ) {
          return null
        }
        return event
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return sentryMiddleware(c as Context, next)
  } else {
    // Skip Sentry when telemetry is disabled
    return next()
  }
}
