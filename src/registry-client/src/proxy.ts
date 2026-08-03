import proc from 'node:process'
import type { Dispatcher } from 'undici'
import { Agent, EnvHttpProxyAgent } from 'undici'

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
 */
export const getDispatcher = (options: Agent.Options): Dispatcher =>
  hasProxyEnv() ? new EnvHttpProxyAgent(options) : new Agent(options)
