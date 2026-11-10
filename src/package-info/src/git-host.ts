import { error } from '@vltpkg/error-cause'
import { revs } from '@vltpkg/git'
import type { RegistryClient } from '@vltpkg/registry-client'
import type { Spec } from '@vltpkg/spec'

/** what an archive host is asked with */
export type Asker = Pick<RegistryClient, 'requestStream'>

/**
 * The host a git dep is fetched from: its archive's origin, or the
 * remote it is cloned from.
 */
export const gitHost = ({ final: f }: Spec) =>
  f.remoteURL ? new URL(f.remoteURL).origin : f.gitRemote

/**
 * Throws if the host a git dep is fetched from doesn't answer within
 * `ms`: an archive host with any HTTP answer to a `HEAD` of its root, a
 * remote with its refs (`git ls-remote`, cached for the clone after
 * it). Unasked, a host that drops packets is waited on as long as the
 * OS waits: minutes. One that fails sooner (refused, unknown, denied)
 * is left to the fetch, which reports it or falls back.
 */
export const gitHostAnswers = async (
  spec: Spec,
  ms: number,
  rc: () => Promise<Asker>,
) => {
  const f = spec.final
  const start = Date.now()
  try {
    if (f.remoteURL) {
      const { body } = await (
        await rc()
      ).requestStream(new URL('/', f.remoteURL), {
        method: 'HEAD',
        connectTimeout: ms,
        headersTimeout: ms,
      })
      // eg an empty gzip body
      body.on('error', () => {})
      body.resume()
    } else if (f.gitRemote) {
      // looked up afresh: the cached lookup takes a failure for no
      // refs. still cached for the clone
      await revs(f.gitRemote, { timeout: ms, noGitRevCache: true })
    }
  } catch (er) {
    if (Date.now() - start < ms) return
    throw error(
      `${gitHost(spec)} did not answer within ${ms / 1000}s`,
      { cause: er },
    )
  }
}
