import type { Context } from 'hono'
import {
  API_DOCS_ENABLED,
  DAEMON_ENABLED,
  DAEMON_PORT,
  DAEMON_URL,
  DEBUG_ENABLED,
  TELEMETRY_ENABLED,
  SENTRY_CONFIG,
  PORT,
  VERSION,
  URL,
} from '../../config.ts'

/**
 * Runtime configuration resolver - can be used outside of routes
 * Checks environment variables and falls back to defaults
 */
export function resolveConfig(env?: any) {
  const getBooleanFromEnv = (
    key: string,
    defaultValue: boolean,
  ): boolean => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const value = env?.[key]
    return typeof value === 'string' ?
        value.toLowerCase() === 'true'
      : defaultValue
  }

  return {
    // Daemon configuration
    DAEMON_ENABLED: getBooleanFromEnv('ARG_DAEMON', DAEMON_ENABLED),

    // Telemetry configuration
    TELEMETRY_ENABLED: getBooleanFromEnv(
      'ARG_TELEMETRY',
      TELEMETRY_ENABLED,
    ),

    // Debug configuration
    DEBUG_ENABLED: getBooleanFromEnv('ARG_DEBUG', DEBUG_ENABLED),

    // Static config values (pass through)
    API_DOCS_ENABLED,
    DAEMON_PORT,
    DAEMON_URL,
    SENTRY_CONFIG,
    PORT,
    VERSION,
    URL,
  }
}

/**
 * Configuration middleware that enriches the context with computed config values
 * Merges compile-time defaults with runtime environment variables
 */
export async function configMiddleware(
  c: Context,
  next: () => Promise<void>,
): Promise<void> {
  // Use the resolver to get computed config
  const runtimeConfig = resolveConfig(c.env)

  // Initialize global config if not already done
  const { initializeGlobalConfig } = await import(
    '../utils/config.ts'
  )
  initializeGlobalConfig(c.env)

  // Enrich the context environment with computed values
  // Ensure c.env exists (it might be undefined in test environments)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  c.env = c.env || {}
  Object.assign(c.env, runtimeConfig)

  await next()
}
