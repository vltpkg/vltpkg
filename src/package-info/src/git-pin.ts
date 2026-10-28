import { resolve as gitResolve } from '@vltpkg/git'
import type { CacheEntry } from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'
import type { Integrity } from '@vltpkg/types'

/**
 * A hosted git dep locked to a commit: the archive url or a clone pin,
 * the archive response read, the sha (none: locked to the ref url),
 * whether the archive has a root `.gitmodules` (unset: not checked yet)
 */
export type GitPin = {
  resolved: string
  response: CacheEntry
  sha?: string
  submodules?: boolean
}

// a full commit sha: the archive at one never changes
const fullSha = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/

// the sha `git ls-remote` gives the ref, if git can tell
const lsRemote = async ({ final: f }: Spec) =>
  f.gitRemote &&
  (await gitResolve(f.gitRemote, f.gitCommittish, { spec: f }))?.sha

// cloned before archives were tried: no ref, `::path:`, `#semver:`
const clonedBefore = (f: Spec) => !f.gitCommittish || !f.remoteURL

// a hosted git dep's archive url at `committish` (none: `HEAD`)
const archiveAt = (f: Spec, committish?: string) =>
  Spec.parse(
    f.name,
    `${f.namedGitHost}:${f.namedGitHostPath}` +
      (committish ? `#${committish}` : ''),
    f.options,
  ).final.remoteURL

// the host's archive url can name a commit
const archivable = (f: Spec) =>
  !!f.namedGitHost &&
  !!f.options['git-host-archives'][f.namedGitHost]?.includes(
    '$committish',
  )

/**
 * The archive url a hosted git dep's commit is read from: its
 * `remoteURL`, or for `::path:` the repo's at the ref.
 */
export const gitArchiveRef = (f: Spec) =>
  f.remoteURL ??
  (!f.range && archivable(f) ?
    archiveAt(f, f.gitCommittish)
  : undefined)

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
    return {
      resolved: ref,
      response: await get(ref),
      sha: f.gitCommittish,
    }
  }
  const head = await get(ref, false)
  // lazy, like the tar pool
  const { gitArchiveCommit } =
    await import('@vltpkg/tar/git-archive-commit')
  const sha =
    gitArchiveCommit(head.buffer()) ?? (await lsRemote(spec))
  const resolved = sha && archiveAt(f, sha)
  if (!resolved || resolved === ref) {
    // eslint-disable-next-line no-console
    console.error(`warning: ${spec}: locked to ${ref}, not a commit`)
    return { resolved: ref, response: head }
  }
  return { resolved, response: await get(resolved), sha }
}

/**
 * Lock a hosted `#semver:` git dep to the archive at its best matching
 * tag's commit (`git ls-remote`). Undefined: no archive url can name a
 * commit, or no tag matches.
 */
export const gitTagPin = async (
  spec: Spec,
  get: (url: string) => Promise<CacheEntry>,
): Promise<GitPin | undefined> => {
  const f = spec.final
  const sha = archivable(f) ? await lsRemote(spec) : undefined
  const resolved = sha && archiveAt(f, sha)
  return resolved ?
      { resolved, response: await get(resolved), sha }
    : undefined
}

/**
 * Archives omit submodules: a dep cloned before archives were tried
 * (no ref, `::path:`, `#semver:`) of a repo with them (root
 * `.gitmodules`) is cloned at the archive's commit instead.
 */
export const gitSubmodulePin = async (
  spec: Spec,
  pin: GitPin,
): Promise<GitPin> => {
  const f = spec.final
  if (!pin.sha || !clonedBefore(f)) return pin
  const { gitArchiveSubmodules } =
    await import('@vltpkg/tar/git-archive-commit')
  // once per pin
  pin.submodules ??= gitArchiveSubmodules(pin.response.buffer())
  return pin.submodules ?
      { ...pin, resolved: gitClonePin(f, pin.sha) }
    : pin
}

// a failed request: the host's answer, if any
type Failure = {
  cause?: { code?: string; response?: { statusCode?: number } }
}

/**
 * A hosted git dep cloned before archives were tried (no ref,
 * `::path:`, `#semver:`) whose archive the host won't serve (any error
 * answer, eg a private repo) or can't be reached: cloned instead.
 */
export const cloneInstead = (spec: Spec, er: unknown) => {
  const f = spec.final
  const c = (er as Failure | undefined)?.cause
  return (
    clonedBefore(f) &&
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

/**
 * `dist.tarball` of a hosted git archive pin: the url, `::path:` kept
 * so the graph takes it for that dir only.
 */
export const gitPinTarball = (
  { gitSelectorParsed }: Spec,
  url: string,
) =>
  gitSelectorParsed?.path ?
    `${url}::path:${gitSelectorParsed.path}`
  : url

/**
 * What `resolve()` answers for a hosted git archive pin. An archive url
 * can't name a `::path:`, so then the commit, as a clone pin.
 */
export const gitPinResolution = (
  spec: Spec,
  { resolved, sha }: GitPin,
  integrity?: Integrity,
) =>
  spec.final.gitSelectorParsed?.path && sha ?
    { resolved: gitClonePin(spec.final, sha), spec }
  : { resolved, integrity, spec }
