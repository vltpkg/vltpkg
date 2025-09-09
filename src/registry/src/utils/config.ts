import { resolveConfig } from '../middleware/config.ts'

/**
 * Global runtime configuration - can be used outside of routes
 * This will be populated when the server starts up with environment variables
 */
let globalRuntimeConfig: ReturnType<typeof resolveConfig> | null =
  null

/**
 * Initialize the global runtime configuration
 * Should be called early in the application lifecycle
 */
export function initializeGlobalConfig(env: any) {
  globalRuntimeConfig = resolveConfig(env)
  return globalRuntimeConfig
}

/**
 * Get the current runtime configuration
 * Falls back to resolving with no environment if not initialized
 */
export function getRuntimeConfig(env: any) {
  if (globalRuntimeConfig) {
    return globalRuntimeConfig
  }
  // Fallback to resolving with the provided env or defaults
  return resolveConfig(env)
}
