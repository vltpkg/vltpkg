import { splitDepID } from '@vltpkg/dep-id'
import type { DepID, DepIDTuple } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { parse, Version } from '@vltpkg/semver'
import { Spec } from '@vltpkg/spec'
import type { GitSelectorParsed } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { relative, resolve } from 'node:path'

/**
 * Return true if the node referenced by this DepID would satisfy the
 * supplied Spec object.
 */
export const satisfies = (
  id: DepID | undefined,
  spec: Spec,
  fromLocation = process.cwd(),
  projectRoot = process.cwd(),
  monorepo?: Monorepo,
): boolean =>
  !!id &&
  satisfiesTuple(
    splitDepID(id),
    spec,
    fromLocation,
    projectRoot,
    monorepo,
  )

export const satisfiesTuple = (
  tuple: DepIDTuple,
  spec: Spec,
  fromLocation = process.cwd(),
  projectRoot = process.cwd(),
  monorepo?: Monorepo,
): boolean => {
  const { options } = spec
  spec = spec.final
  const [type, first, second] = tuple
  if (spec.type !== type) return false

  switch (spec.type) {
    case 'registry': {
      if (!first) {
        // must be from the default registry
        if (spec.registry !== options.registry) {
          return false
        }
      } else {
        const namedRegistry = options.registries[first]
        if (namedRegistry && namedRegistry !== spec.registry) {
          // we know the name, and it's not the registry being used
          return false
        } else if (!namedRegistry && first !== spec.registry) {
          // an explicit registry URL, but does not match
          return false
        }
      }
      /* c8 ignore next */
      if (!second) throw error('Invalid DepID', { found: tuple })
      const [name, version] = parseNameVer(second)
      return (
        // mismatched name always invalid
        name !== spec.name || !version ? false
          // if just a dist-tag, assume valid
        : !spec.range ? true
        : spec.range.test(Version.parse(version))
      )
    }

    case 'file': {
      /* c8 ignore next - should be impossible */
      if (spec.file === undefined) return false
      const resolvedSpec = resolve(
        projectRoot,
        fromLocation,
        spec.file,
      )
      const resolvedId = resolve(projectRoot, first)
      // valid if the relative path is '', refers to the same path
      return !relative(resolvedSpec, resolvedId)
    }

    case 'workspace': {
      monorepo ??= Monorepo.load(projectRoot)
      /* c8 ignore next */
      if (!spec.workspace) return false
      const fromID = monorepo.get(first)
      const fromSpec = monorepo.get(spec.workspace)
      if (fromID !== fromSpec || !fromSpec || !fromID) return false
      if (!spec.range) return true
      const v = parse(fromID.manifest.version ?? '')
      return !!v && spec.range.test(v)
    }

    case 'remote': {
      return spec.remoteURL === first
    }

    case 'git': {
      const {
        gitRemote,
        gitSelectorParsed = {},
        gitSelector,
        gitCommittish,
        namedGitHost,
        namedGitHostPath,
      } = spec
      if (gitRemote !== first) {
        if (namedGitHost && namedGitHostPath) {
          const ngh = `${namedGitHost}:`
          if (first.startsWith(ngh)) {
            if (first !== ngh + namedGitHostPath) return false
          } else return false
        } else return false
      }
      if (gitSelector && !second) return false
      /* c8 ignore next - always set to something, even if empty */
      const [parsed, committish] = Spec.parseGitSelector(second ?? '')
      if (gitCommittish && committish)
        return !!committish.startsWith(gitCommittish)
      for (const [k, v] of Object.entries(gitSelectorParsed)) {
        if (parsed[k as keyof GitSelectorParsed] !== v) return false
      }
      return true
    }

    /* c8 ignore start */
    default: {
      throw error('Invalid spec type', { spec })
    }
  }
  /* c8 ignore stop */
}

const parseNameVer = (nv: string): [string, string] => {
  const at = nv.lastIndexOf('@')
  // if it's 0, means @scoped without a version
  return at <= 0 ?
      [nv, '']
    : [nv.substring(0, at), nv.substring(at + 1)]
}
