import {
  API_DOCS_ENABLED,
  DAEMON_ENABLED,
  DAEMON_START_SERVER,
  DAEMON_PORT,
  DAEMON_URL,
  DEBUG_ENABLED,
  TELEMETRY_ENABLED,
  SENTRY_CONFIG,
  VERSION,
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
    const value = (env as Record<string, unknown> | undefined)?.[key]
    return typeof value === 'string' ?
        value.toLowerCase() === 'true'
      : defaultValue
  }

  const getStringFromEnv = (
    key: string,
    defaultValue: string,
  ): string => {
    const value = (env as Record<string, unknown> | undefined)?.[key]
    if (value) {
      return typeof value === 'string' ? value : defaultValue
    } else {
      return defaultValue
    }
  }

  const getNumberFromEnv = (
    key: string,
    defaultValue: number,
  ): number => {
    const value = (env as Record<string, unknown> | undefined)?.[key]
    if (value) {
      return typeof value === 'string' ?
          parseInt(value, 10)
        : defaultValue
    } else {
      return defaultValue
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const ARG_PORT = env?.ARG_PORT || '1337'

  // Resolve port and base URL from env (injected by vsr) or fallbacks
  const resolvedPort = Number(ARG_PORT)

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const ARG_HOST = env?.ARG_HOST || 'localhost'

  const runtimeUrl = `http://${ARG_HOST}:${resolvedPort}`

  return {
    // Daemon configuration
    DAEMON_ENABLED: getBooleanFromEnv('ARG_DAEMON', DAEMON_ENABLED),
    // start server is used to control whether or not vsr should
    // spawn a new local daemon server for the browser-based UI
    DAEMON_START_SERVER: getBooleanFromEnv(
      'DAEMON_START_SERVER',
      DAEMON_START_SERVER,
    ),
    DAEMON_PORT: getNumberFromEnv('DAEMON_PORT', DAEMON_PORT),
    DAEMON_URL: getStringFromEnv('DAEMON_URL', DAEMON_URL),

    // Telemetry configuration
    TELEMETRY_ENABLED: getBooleanFromEnv(
      'ARG_TELEMETRY',
      TELEMETRY_ENABLED,
    ),

    // Debug configuration
    DEBUG_ENABLED: getBooleanFromEnv('ARG_DEBUG', DEBUG_ENABLED),

    // Static config values (pass through)
    API_DOCS_ENABLED,
    SENTRY_CONFIG,
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
  }
}
