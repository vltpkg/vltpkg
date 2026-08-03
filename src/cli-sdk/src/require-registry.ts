import { error } from '@vltpkg/error-cause'
import type { LoadedConfig } from './config/index.ts'

/**
 * There is no default registry. This is the single message used
 * everywhere a registry is required but missing.
 */
export const missingRegistryError = (): Error =>
  error(
    `Missing registry configuration. Run 'vlt login --registry=<url>', ` +
      `set "registry" in vlt.json, or pass --registry. ` +
      `See https://docs.vlt.sh/cli`,
    { code: 'ECONFIG' },
  )

/**
 * Read `conf.options.registry`, throwing the `ECONFIG` error if it is
 * not set. Commands marked `needsRegistry` are already checked in
 * `outputCommand()`, but this keeps the invariant honest for TypeScript
 * and for programmatic callers.
 */
export const requireRegistry = (conf: LoadedConfig): string => {
  const { registry } = conf.options
  if (!registry) throw missingRegistryError()
  return registry
}
