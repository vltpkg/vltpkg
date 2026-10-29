import { resolve as gitResolve } from '@vltpkg/git'
import type { CacheEntry } from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'

/** a hosted git ref locked to a commit: the archive url, its response */
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
 * cache. No sha, or no url for it: the ref url, with a warning.
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
  // lazy, like the tar pool
  const { gitArchiveCommit } =
    await import('@vltpkg/tar/git-archive-commit')
  const sha =
    gitArchiveCommit(head.buffer()) ?? (await lsRemote(spec))
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
