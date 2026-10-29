import { resolve as gitResolve } from '@vltpkg/git'
import type { CacheEntry } from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'

/**
 * a hosted git ref locked to a commit: the archive url or a clone pin,
 * and the archive response read
 */
export type GitPin = { resolved: string; response: CacheEntry }

// a full commit sha: the archive at one never changes
const fullSha = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/

// the sha `git ls-remote` gives the ref, if git can tell
const lsRemote = async ({ final: f }: Spec) =>
  f.gitRemote &&
  (await gitResolve(f.gitRemote, f.gitCommittish, { spec: f }))?.sha

/**
 * Lock a hosted git ref (archive url `ref`) to the commit it points at:
 * the archive at the sha its ref archive was made from (pax header,
 * else `git ls-remote`). A ref moves, so its archive is fetched past the
 * cache. No sha, or no url for it: the ref url, with a warning. No ref
 * and submodules: a clone pin, `<remote>#<sha>`.
 */
export const gitPin = async (
  spec: Spec,
  ref: string,
  get: (url: string, useCache?: false) => Promise<CacheEntry>,
): Promise<GitPin> => {
  const f = spec.final
  if (fullSha.test(String(f.gitCommittish))) {
    return { resolved: ref, response: await get(ref) }
  }
  const head = await get(ref, false)
  const buf = head.buffer()
  // lazy, like the tar pool
  const { gitArchiveCommit, gitArchiveSubmodules } =
    await import('@vltpkg/tar/git-archive-commit')
  const sha = gitArchiveCommit(buf) ?? (await lsRemote(spec))
  // no ref, submodules (an archive has none): a clone at the commit
  if (sha && !f.gitCommittish && gitArchiveSubmodules(buf)) {
    return { resolved: gitClonePin(f, sha), response: head }
  }
  const resolved =
    sha &&
    Spec.parse(
      f.name,
      `${f.namedGitHost}:${f.namedGitHostPath}#${sha}`,
      f.options,
    ).final.remoteURL
  if (!resolved || resolved === ref) {
    // eslint-disable-next-line no-console
    console.error(`warning: ${spec}: locked to ${ref}, not a commit`)
    return { resolved: ref, response: head }
  }
  return { resolved, response: await get(resolved) }
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
