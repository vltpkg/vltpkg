import { splitDepID } from '@vltpkg/dep-id/browser'
import type { DepID } from '@vltpkg/dep-id/browser'

type Pinned = {
  integrity?: string | null
  resolved?: string | null
}

// the full sha in a git node's `resolved`, if any: an archive url's
// last one, a clone's only as `<remote>#<sha>` (a token is no commit)
const resolvedCommit = (resolved?: string | null) =>
  remoteOnly(resolved) ?
    /#([0-9a-f]{40}|[0-9a-f]{64})(?:::|$)/.exec(String(resolved))?.[1]
  : resolved
      ?.match(
        /(?<![0-9a-f])(?:[0-9a-f]{64}|[0-9a-f]{40})(?![0-9a-f])/g,
      )
      ?.at(-1)

// a clone row, not an archive url; w/o a sha it may be at any commit
const remoteOnly = (resolved?: string | null) =>
  !!resolved && !/^https?:\/\//.test(resolved)

/**
 * Two copies of one git DepID at other commits (eg `vlt update` moved
 * the pin): by integrity when both know one, else by a sha in
 * `resolved`; a clone known by its remote only may be at any commit.
 * A copy knowing nothing (an archive read from node_modules, a node
 * not resolved yet) is no change.
 */
export const gitPinMoved = (a: Pinned, b: Pinned) => {
  if (a.integrity && b.integrity) return a.integrity !== b.integrity
  const sa = resolvedCommit(a.resolved)
  const sb = resolvedCommit(b.resolved)
  if (sa && sb) return sa !== sb
  return sa ? remoteOnly(b.resolved) : !!sb && remoteOnly(a.resolved)
}

const fullSha = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/

/**
 * A git node locked to a commit: `resolved` names one, or its ref is a
 * full sha. Rows from older lockfiles are locked to a ref only.
 */
export const gitPinned = (node: Pinned & { id: DepID }) =>
  !!resolvedCommit(node.resolved) ||
  !!splitDepID(node.id)[2]
    ?.split('::')
    .some(s => fullSha.test(s))
