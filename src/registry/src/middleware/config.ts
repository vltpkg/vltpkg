import type { Context } from 'hono'
import {
  API_DOCS_ENABLED,
  DAEMON_ENABLED,
  DAEMON_PORT,
  DAEMON_URL,
  DEBUG_ENABLED,
  TELEMETRY_ENABLED,
  SENTRY_CONFIG,
  VERSION,
} from '../../config.ts'

const DEFAULT_PORT = 1337
const DEFAULT_URL = `http://localhost:${DEFAULT_PORT}`

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

  // Resolve port and base URL from env (injected by vsr) or fallbacks
  const resolvedPort =
    typeof env?.ARG_PORT === 'string' ?
      Number(env.ARG_PORT) || DEFAULT_PORT
    : DEFAULT_PORT
  const runtimeUrl =
    (typeof env?.ARG_URL === 'string' && env.ARG_URL) ||
    (typeof env?.ARG_HOST === 'string' && env.ARG_HOST ?
      `http://${env.ARG_HOST}:${resolvedPort}`
    : DEFAULT_URL)

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
    // Allow overriding PORT/URL via vars from vsr
    PORT: resolvedPort,
    VERSION,
    URL: runtimeUrl,
    REDIRECT_URI: `${runtimeUrl}/-/auth/callback`,
    ORIGIN_CONFIG: {
      default: 'local',
      upstreams: {
        local: {
          type: 'local',
          url: runtimeUrl,
          allowPublish: true,
        },
        npm: {
          type: 'npm',
          url: 'https://registry.npmjs.org',
        },
      },
    },
    PROXY: true,
    PROXY_URL: runtimeUrl,
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
