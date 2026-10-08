import { getTokenByURL, registryKeys } from '@vltpkg/registry-client'
import type { GetAuthHeader } from '@vltpkg/query'
import type { LoadedConfig } from './config/index.ts'

/**
 * Returns a {@link GetAuthHeader} implementation that looks up
 * authorization tokens from the local keychain / env (incl.
 * `VLT_TOKEN_<key>` for configured registries), used by
 * network-reliant query selectors, e.g: `:outdated()`.
 */
export const createGetAuthHeader = (
  conf: LoadedConfig,
): GetAuthHeader => {
  const keys = registryKeys(conf.options)
  return async url => getTokenByURL(url, conf.options.identity, keys)
}
