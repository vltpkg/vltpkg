import proc from 'node:process'
import type { buildConnector, Dispatcher } from 'undici'
import { Agent, EnvHttpProxyAgent } from 'undici'
import { caSecureContext } from './ca-file.ts'

/**
 * Options for {@link getDispatcher}: those of an {@link Agent}, with
 * `connect` as options for undici's connector rather than a connector of
 * its own, so that the CA file can be added to them.
 */
export type DispatcherOptions = Omit<Agent.Options, 'connect'> & {
  connect?: buildConnector.BuildOptions
}

// Matches how undici's EnvHttpProxyAgent reads these: lowercase wins
// over uppercase, and an empty string counts as unset.
const hasProxyEnv = () =>
  !!(proc.env.http_proxy ?? proc.env.HTTP_PROXY) ||
  !!(proc.env.https_proxy ?? proc.env.HTTPS_PROXY)

/**
 * Build the dispatcher that all registry traffic goes through.
 *
 * With no proxy in the environment this is the same plain {@link Agent}
 * vlt has always used, so the default path is unchanged. When
 * `http_proxy` or `https_proxy` is set, undici's
 * {@link EnvHttpProxyAgent} takes over. It tunnels proxied origins with
 * `CONNECT`, still dials `no_proxy` origins directly, and receives the
 * identical options, so timeouts, keepalive, and pooling are the same
 * either way.
 *
 * If `npm_config_cafile` is set, connections trust only the
 * certificates in that file. The proxy agent reads `connect` for
 * origins it dials directly, `requestTls` for origins it tunnels to, and
 * `proxyTls` for an https proxy, so the context goes on all three.
 */
export const getDispatcher = (
  options: DispatcherOptions,
): Dispatcher => {
  const secureContext = caSecureContext()
  const opts: EnvHttpProxyAgent.Options =
    secureContext ?
      {
        ...options,
        connect: { ...options.connect, secureContext },
        requestTls: { secureContext },
        proxyTls: { secureContext },
      }
    : options
  return hasProxyEnv() ? new EnvHttpProxyAgent(opts) : new Agent(opts)
}
