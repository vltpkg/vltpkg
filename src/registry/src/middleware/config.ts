import type { Context } from 'hono'
import { resolveConfig } from '../utils/resolve-config.ts'

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

  // Enrich the context environment with computed values
  // Ensure c.env exists (it might be undefined in test environments)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  c.env = c.env || {}
  Object.assign(c.env, runtimeConfig)

  await next()
}
