import { availableParallelism } from 'node:os'
import { RetryAgent } from 'undici'
import { getDispatcher } from './proxy.ts'
import { retryErrorCodes } from './transport-retry.ts'
import type { Transport, TransportOptions } from './transport.ts'
import type { Agent } from 'undici'

// Agent-level knobs only. Do not spread these onto per-request options —
// connections/pipelining/keepAlive/connect are ignored at dispatch time,
// and bodyTimeout/headersTimeout would clobber caller overrides.
//
// Keep undici (not globalThis.fetch) on Node: fetch measured +56% user CPU
// and +90-140MB RSS on the same 753-body install workload.
// pipelining:1 is intentional — pipelining:10 had no measured CPU benefit
// and HOL-blocks packuments behind large tarballs; some CDNs drop pipelined
// requests.
// connections scales with reify's in-flight cap ((cores-1)*8, see
// src/graph/src/reify/index.ts) so tarball fetches don't queue behind
// the pool on many-core machines. The floor of 64 bounds cold-start TLS
// on small machines; the ceiling of 128 avoids connection storms and
// CDN throttling beyond what reify can consume.
// HTTP/2 (allowH2) is untested and unjustified while transport CPU is ~1/4
// of body handling.
const agentOptions: Agent.Options = {
  bodyTimeout: 600_000,
  headersTimeout: 600_000,
  keepAliveMaxTimeout: 1_200_000,
  keepAliveTimeout: 600_000,
  keepAliveTimeoutThreshold: 30_000,
  connect: {
    timeout: 600_000,
    keepAlive: true,
    keepAliveInitialDelay: 30_000,
    sessionTimeout: 600,
  },
  connections: Math.min(
    128,
    Math.max(64, (availableParallelism() - 1) * 8),
  ),
  pipelining: 1,
}

/** the Node transport: pooled undici, retries and proxying included */
export const undiciTransport = (
  options: TransportOptions,
): Transport =>
  new RetryAgent(getDispatcher(agentOptions), {
    ...options,
    retryAfter: true,
    errorCodes: retryErrorCodes,
  })
