import { resolve as gitResolve } from '@vltpkg/git'
import type {
  CacheEntry,
  RegistryClient,
} from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'

/**
 * a hosted git ref locked to a commit: the archive url or a clone pin,
 * the archive url its response was read from (the cache has it)
 */
export type GitPin = {
  resolved: string
  archive: string
  response: CacheEntry
}

/** what an archive's head is read with */
export type Streamer = Pick<RegistryClient, 'requestStream'>

// a full commit sha: the archive at one never changes
const fullSha = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/

// bytes of a git archive that hold its commit: the pax header leads,
// and gitArchiveCommit() inflates no more than this
const archiveHead = 4096

// the sha `git ls-remote` gives the ref, if git can tell
const lsRemote = async ({ final: f }: Spec) =>
  f.gitRemote &&
  (await gitResolve(f.gitRemote, f.gitCommittish, { spec: f }))?.sha

// a hosted git dep's archive url at `committish`
const archiveAt = (f: Spec, committish: string) =>
  Spec.parse(
    f.name,
    `${f.namedGitHost}:${f.namedGitHostPath}#${committish}`,
    f.options,
  ).final.remoteURL

// the host's archive url can name a commit
const archivable = (f: Spec) =>
  !!f.namedGitHost &&
  !!f.options['git-host-archives'][f.namedGitHost]?.includes(
    '$committish',
  )

/**
 * Lock a hosted git ref (archive url `ref`) to the commit it points at:
 * the sha in the head of its archive (pax header; a ref moves, so read
 * off the host, and only that far), else `git ls-remote`. The archive
 * at the sha is what gets locked. No sha, or no url that names one:
 * the ref archive, revalidated, with a warning. No ref and submodules
 * (an archive has none): a clone pin, `<remote>#<sha>`.
 *
 * `get` fetches an archive into the cache (`revalidate`: asking the
 * host even for a cached one); `rc` streams the head of one.
 */
export const gitPin = async (
  spec: Spec,
  ref: string,
  get: (url: string, revalidate?: true) => Promise<CacheEntry>,
  rc: Streamer,
): Promise<GitPin> => {
  const f = spec.final
  if (fullSha.test(String(f.gitCommittish))) {
    return { resolved: ref, archive: ref, response: await get(ref) }
  }
  const sha =
    archivable(f) ? await commitOf(spec, ref, rc) : undefined
  const resolved = sha && archiveAt(f, sha)
  if (!resolved) {
    const response = await get(ref, true)
    // eslint-disable-next-line no-console
    console.error(`warning: ${spec}: locked to ${ref}, not a commit`)
    return { resolved: ref, archive: ref, response }
  }
  const response = await get(resolved)
  // no ref, submodules (an archive has none): a clone at the commit
  if (!f.gitCommittish) {
    const { gitArchiveSubmodules } =
      await import('@vltpkg/tar/git-archive-commit')
    if (gitArchiveSubmodules(response.buffer())) {
      return {
        resolved: gitClonePin(f, sha),
        archive: resolved,
        response,
      }
    }
  }
  return { resolved, archive: resolved, response }
}

// the commit the ref's archive was made from, if it can be found
const commitOf = async (spec: Spec, ref: string, rc: Streamer) => {
  const data = await readHead(rc, ref, archiveHead)
  // lazy, like the tar pool
  const { gitArchiveCommit } =
    await import('@vltpkg/tar/git-archive-commit')
  return (data && gitArchiveCommit(data)) ?? (await lsRemote(spec))
}

// the first `bytes` of what a url serves: a 200 read that far, then
// dropped, connection and all. undefined for any other answer, or
// none: the full fetch that follows reports it (and takes the
// redirects and retries request() does)
const readHead = async (
  rc: Streamer,
  url: string,
  bytes: number,
): Promise<Buffer | undefined> => {
  const res = await rc.requestStream(url).catch(() => undefined)
  if (!res) return undefined
  const { statusCode, body } = res
  if (statusCode !== 200) {
    body.resume()
    return undefined
  }
  return await new Promise<Buffer>(resolve => {
    const chunks: Buffer[] = []
    let n = 0
    body.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
      n += chunk.length
      if (n >= bytes) body.destroy()
    })
    // a body cut short, by the host or just above: what was read
    body.on('error', () => {})
    body.on('close', () => resolve(Buffer.concat(chunks)))
  })
}

// a failed request: the host's answer, if any
type Failure = {
  cause?: { code?: string; response?: { statusCode?: number } }
}

/**
 * A hosted git dep without a ref whose archive the host won't serve
 * (any error answer, eg a private repo) or can't be reached: cloned
 * instead, as before archives were tried.
 */
export const cloneInstead = (spec: Spec, er: unknown) => {
  const c = (er as Failure | undefined)?.cause
  return (
    !spec.final.gitCommittish &&
    (c?.code === 'EREQUEST' || !!c?.response?.statusCode)
  )
}

/** a cloned git dep locked to a commit: `<remote>#<sha>`, path kept */
export const gitClonePin = (
  { gitRemote, gitSelectorParsed }: Spec,
  sha: string,
) =>
  `${gitRemote}#${sha}` +
  (gitSelectorParsed?.path ? `::path:${gitSelectorParsed.path}` : '')

/** the commit a cloned git dep's `resolved` is locked to, if any */
export const gitPinnedCommit = (resolved?: string) =>
  /#([0-9a-f]{40}|[0-9a-f]{64})(?:::|$)/.exec(resolved ?? '')?.[1]
