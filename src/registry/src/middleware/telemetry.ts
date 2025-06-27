import { sentry } from '@hono/sentry'
import type { Context } from 'hono'

/**
 * Telemetry middleware that conditionally applies Sentry based on configuration
 * Relies on configMiddleware to have already enriched c.env with TELEMETRY_ENABLED
 */
export async function telemetryMiddleware(
  c: Context,
  next: () => Promise<void>,
) {
  // Check if telemetry is enabled via the enriched config
  if (c.env.TELEMETRY_ENABLED) {
    // Apply Sentry middleware dynamically
    const sentryMiddleware = sentry({
      dsn: c.env?.SENTRY?.dsn || c.env.SENTRY_CONFIG.dsn,
      environment:
        c.env?.SENTRY?.environment || c.env.SENTRY_CONFIG.environment,
      sendDefaultPii: c.env.SENTRY_CONFIG.sendDefaultPii,
      sampleRate: c.env.SENTRY_CONFIG.sampleRate,
      tracesSampleRate: c.env.SENTRY_CONFIG.tracesSampleRate,
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

    return sentryMiddleware(c, next)
  } else {
    // Skip Sentry when telemetry is disabled
    return next()
  }
}
