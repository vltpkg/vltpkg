import { error } from '@vltpkg/error-cause'
import {
  currentDefaultRegistryName,
  defaultRegistryName,
  Spec,
} from '@vltpkg/spec/browser'
import type { SpecOptions } from '@vltpkg/spec/browser'
import type { Manifest } from '@vltpkg/types'

export const delimiter: Delimiter = '·'
export type Delimiter = '·'
const EXTRA_PEER_SET_DELIMITER = 'ṗ:'

/**
 * Dependency IDs are a URI-encoded set of strings, separated
 * by the {@link Delimiter} character (`'·'`).
 *
 * The first entry is always the specifier type. The rest depend on the
 * type. `git`, `registry`, and `workspace` entries have 3 fields, the rest
 * have 2.
 *
 * - `registry`: `'registry·<registry>·name@specifier'`
 *   The `<registry>` portion can be a known named registry name, or a
 *   url to a registry. If empty, it is the default registry. Examples:
 *   - `··some-package@2.0.1`
 *   - `·npm·whatever@1.2.3`
 *   - `·http%3A%2F%2Fvlt.sh%2F·x@1.2.3`
 * - `git`: `'git·<git remote>·<git selector>'`. For example:
 *   - `git·github:user/project·branchname`
 *   - `git·git%2Bssh%3A%2F%2Fuser%40host%3Aproject.git·semver:1.x`
 * - `workspace`: `'workspace·<path>'`. For example:
 *   - `workspace·src/mything`
 * - `remote`: `'remote·<url>'`
 * - `file`: `'file·<path>'`
 *
 * Lastly, the final portion can contain arbitrary string data, and is
 * used to store peer dep resolutions to maintain the peerDep contract.
 */
export type DepID =
  | `${'' | 'git'}${Delimiter}${string}${Delimiter}${string}${Delimiter}${string}`
  | `${'' | 'git'}${Delimiter}${string}${Delimiter}${string}`
  | `${'file' | 'remote' | 'workspace'}${Delimiter}${string}${Delimiter}${string}`
  | `${'file' | 'remote' | 'workspace'}${Delimiter}${string}`

/**
 * A {@link DepID}, split apart and URI-decoded
 */
export type DepIDTuple =
  | [
      type: 'git',
      gitRemote: string,
      gitSelector: string,
      extra?: string,
    ]
  | [
      type: 'registry',
      registry: string,
      registrySpec: string,
      extra?: string,
    ]
  | [type: 'file', path: string, extra?: string]
  | [type: 'remote', url: string, extra?: string]
  | [type: 'workspace', workspace: string, extra?: string]

const depIDRegExp = new RegExp(
  `^((git)?${delimiter}[^${delimiter}]*${delimiter}[^${delimiter}]*(${
    delimiter
  }[^${delimiter}]*)?$` +
    `|` +
    `^(file|remote|workspace)${delimiter}[^${
      delimiter
    }]*)(${delimiter}[^${delimiter}]*)?$`,
)

export const isDepID = (str: unknown): str is DepID =>
  typeof str === 'string' && depIDRegExp.test(str)

export const asDepID = (str: string): DepID => {
  if (!isDepID(str)) {
    throw error('Expected dep id', {
      found: str,
    })
  }
  return str
}

/**
 * turn a {@link DepIDTuple} into a {@link DepID}
 */
export const joinDepIDTuple = (list: DepIDTuple): DepID => {
  const [type, first, second, extra] = list
  const f = encode(first)
  switch (type) {
    case 'registry':
      return `${delimiter}${f || defaultRegistryName}${delimiter}${encode(second)}${extra ? `${delimiter}${encode(extra)}` : ''}`
    case 'git':
      return `${type}${delimiter}${f}${delimiter}${encode(second)}${extra ? `${delimiter}${encode(extra)}` : ''}`
    default:
      return `${type}${delimiter}${f}${second ? `${delimiter}${encode(second)}` : ''}`
  }
}

// allow @, but otherwise, escape everything urls do
const encode = (s?: string) =>
  s ?
    encodeURIComponent(s)
      .replaceAll('%40', '@')
      .replaceAll('%2f', '§')
      .replaceAll('%2F', '§')
  : s

const decode = (s?: string) =>
  s ?
    decodeURIComponent(
      s.replaceAll('@', '%40').replaceAll('§', '%2F'),
    )
  : s

const seenSplitDepIDs = new Map<string, DepIDTuple>()
/**
 * turn a {@link DepID} into a {@link DepIDTuple}
 */
export const splitDepID = (id: string): DepIDTuple => {
  // memoized entries return early
  const seen = seenSplitDepIDs.get(id)
  if (seen) return seen

  let res: DepIDTuple
  const [type, first = '', second, extra] = id
    .replaceAll('§', '/')
    .split(delimiter, 4)
  const f = decodeURIComponent(first)
  switch (type) {
    case 'git':
    case '': {
      if (second === undefined) {
        throw error(`invalid ${type} id`, { found: id })
      }
      res = [
        type || 'registry',
        f || defaultRegistryName,
        decodeURIComponent(second),
        decode(extra),
      ]
      break
    }
    case 'file':
    case 'remote':
    case 'workspace': {
      res = [type, f, decode(second)]
      break
    }
    default: {
      throw error('invalid DepID type', {
        found: type,
        validOptions: ['git', 'file', 'workspace', 'remote', ''],
      })
    }
  }
  seenSplitDepIDs.set(id, res)
  return res
}

/**
 * Retrieves the base {@link DepID} for a given depID,
 * ignoring any extra information that may be present.
 */
export const baseDepID = (id: string): DepID => {
  const [type, first, second] = splitDepID(id)
  switch (type) {
    case 'git':
    case 'registry':
      return joinDepIDTuple([type, first, second])
    default:
      return joinDepIDTuple([type, first])
  }
}

const seenHydrated = new Map<string, Spec>()
/**
 * Turn a {@link DepID} into a {@link Spec} object
 */
export const hydrate = (
  id: DepID,
  name?: string,
  options: SpecOptions = {},
): Spec => {
  // memozied entries return early
  const cacheKey = (name ?? '') + id
  const seen = seenHydrated.get(cacheKey)
  if (seen) return seen

  const res = hydrateTuple(splitDepID(id), name, options)
  seenHydrated.set(cacheKey, res)
  return res
}

const seenHydratedTuples = new Map<string, Spec>()
/**
 * Turn a {@link DepIDTuple} into a {@link Spec} object
 */
export const hydrateTuple = (
  tuple: DepIDTuple,
  name?: string,
  options: SpecOptions = {},
): Spec => {
  const [type, first, second] = tuple

  // memoized entries return early
  const cacheKey =
    (name ?? '') + ',' + type + ',' + first + ',' + (second ?? '')
  const seen = seenHydratedTuples.get(cacheKey)
  if (seen) return seen

  let res: Spec
  switch (type) {
    case 'remote': {
      if (!first)
        throw error('no remoteURL found on remote id', {
          found: tuple,
        })
      res = Spec.parse(name ?? '(unknown)', first, options)
      break
    }
    case 'file': {
      if (!first) {
        throw error('no file path found on remote id', {
          found: tuple,
        })
      }
      res = Spec.parse(name ?? '(unknown)', `file:${first}`, options)
      break
    }
    case 'registry': {
      if (typeof first !== 'string') {
        throw error('no registry url or name in registry ID', {
          found: tuple,
        })
      }
      if (!second) {
        throw error('no name/specifier in registry ID', {
          found: tuple,
        })
      }
      const defaultName =
        options.registry &&
        currentDefaultRegistryName(options.registry, options)
      const defaultRegistryURL =
        options.registry ?
          options.registry.endsWith('/') ?
            options.registry
          : options.registry + '/'
        : undefined
      const firstURL = first.endsWith('/') ? first : first + '/'
      const hasScope = second.startsWith('@')
      const hasAtVersion = second.includes('@', hasScope ? 1 : 0)
      const name_ =
        (hasAtVersion && hasScope ?
          `@${second.split('@')[1]}`
        : second.split('@')[0]) /* c8 ignore next */ || '(unknown)'
      const usesDefaultRegistry =
        !first ||
        first === defaultName ||
        firstURL === defaultRegistryURL
      const noAliasedNameUsed = !name || name === name_
      if (usesDefaultRegistry && noAliasedNameUsed) {
        const version =
          (hasAtVersion &&
            second.split('@')[
              hasScope ? 2 : 1
            ]) /* c8 ignore next */ ||
          second
        res = Spec.parse(name || name_, version, options)
        break
      }
      if (!/^https?:\/\//.test(first)) {
        const reg = options.registries?.[first]
        if (first !== defaultRegistryName && !reg) {
          throw error('named registry not found in options', {
            name: first,
            found: tuple,
          })
        }
        res = Spec.parse(name || name_, `${first}:${second}`, options)
        break
      }
      res = Spec.parse(
        name || name_,
        `registry:${first}#${second}`,
        options,
      )
      break
    }
    case 'git': {
      if (!first) {
        throw error('no git remote in git ID', {
          found: tuple,
        })
      }
      res = Spec.parse(
        name ?? '(unknown)',
        first + '#' + second,
        options,
      )
      break
    }
    case 'workspace': {
      if (!first) {
        throw error('no name/path on workspace id', { found: tuple })
      }
      res =
        name && name !== first ?
          Spec.parse(name, `workspace:${first}@*`, options)
        : Spec.parse(first, `workspace:*`, options)
      break
    }
  }
  seenHydratedTuples.set(cacheKey, res)
  return res
}

const matchRegistryURL = (
  registry: string,
  registries: Record<string, string>,
): string | undefined => {
  // iterate on known registries to check if any known value
  // matches the current default registry of this Spec value
  for (const [alias, url] of Object.entries(registries)) {
    // normalize trailing slash for comparison
    const specRegURL =
      registry.endsWith('/') ? registry : registry + '/'
    const knownRegURL = url.endsWith('/') ? url : url + '/'
    if (specRegURL === knownRegURL) {
      return alias
    }
  }
}

/**
 * Convert a Spec's registry URL to a known short registry name, if possible.
 */
const convertToKnownShortRegistryName = (
  s: Spec,
  registry?: string,
): string | undefined => {
  if (!s.registry) return
  const reg = registry ?? s.registry
  const namedRegistry = matchRegistryURL(reg, s.options.registries)
  if (namedRegistry) return namedRegistry

  const namedJSRRegistry = matchRegistryURL(
    reg,
    s.options['jsr-registries'],
  )
  if (namedJSRRegistry) return namedJSRRegistry
}

const seenTuples = new Map<string, DepIDTuple>()
/**
 * Get the {@link DepIDTuple} for a given {@link Spec} and {@link Manifest}.
 * The Manifest is used to get the name and version, if possible. If not found
 * in the manifest, registry ID types will use the name or bareSpec from the
 * specifier, so at least there's something to use later.
 */
export const getTuple = (
  spec: Spec,
  mani: Pick<Manifest, 'name' | 'version'>,
  extra?: string,
): DepIDTuple => {
  // memoized entries return early
  const cacheKey =
    String(spec) +
    (spec.registry ?? '') +
    (mani.name ?? '') +
    (mani.version ?? '') +
    (extra ?? '')
  const seen = seenTuples.get(cacheKey)
  if (seen) return seen

  let res: DepIDTuple
  const f = spec.final
  switch (f.type) {
    case 'registry': {
      const version =
        mani.version ?
          mani.version.startsWith('v') ?
            mani.version.slice(1)
          : mani.version
        : f.bareSpec
      res = [
        f.type,
        f.namedRegistry ||
          convertToKnownShortRegistryName(f, f.scopeRegistry) ||
          f.scopeRegistry ||
          f.registry ||
          defaultRegistryName,
        `${isPackageNameConfused(spec, mani.name) ? spec.name : (mani.name ?? f.name)}@${version}`,
        extra,
      ]
      break
    }
    case 'git': {
      const {
        namedGitHost,
        namedGitHostPath,
        gitRemote,
        gitSelector = '',
      } = f
      if (!gitRemote)
        throw error('no host on git specifier', { spec })
      if (namedGitHost) {
        if (!namedGitHostPath) {
          throw error('named git host without path portion', {
            spec,
          })
        }
        res = [
          f.type,
          `${namedGitHost}:${namedGitHostPath}`,
          gitSelector,
          extra,
        ]
        break
      } else {
        res = [f.type, gitRemote, gitSelector, extra]
      }
      break
    }
    case 'remote': {
      const { remoteURL } = f
      if (!remoteURL)
        throw error('no URL on remote specifier', { spec })
      res = [f.type, remoteURL, extra]
      break
    }
    case 'file':
    case 'workspace':
      throw error('Path-based dep ids are not supported', { spec })
  }
  seenTuples.set(cacheKey, res)
  return res
}

/**
 * Checks for a potentially manifest-confused package name.
 * Returns `true` if the package name is confused, `false` otherwise.
 */
export const isPackageNameConfused = (spec?: Spec, name?: string) =>
  !!spec?.name && // a nameless spec can't be checked
  !spec.subspec && // it's not an aliased package or using a custom protocol
  spec.type === 'registry' && // the defined spec is of type registry
  spec.name !== name // its name is not the same as the defined spec name

/**
 * Get the {@link DepID} for a given {@link Spec} and {@link Manifest}. The
 * Manifest is used to get the name and version, if possible. If not found in
 * the manifest, registry ID types will use the name or bareSpec from the
 * specifier, so at least there's something to use later.
 */
export const getId = (
  spec: Spec,
  mani: Pick<Manifest, 'name' | 'version'>,
  extra?: string,
): DepID => joinDepIDTuple(getTuple(spec, mani, extra))

/**
 * Join a modifier and a peer set hash into a single "extra" string.
 */
export function joinExtra({
  modifier,
  peerSetHash,
}: {
  modifier?: string
  peerSetHash?: string
}): string | undefined {
  if (!modifier && !peerSetHash) return
  if (modifier && peerSetHash) return `${modifier}${peerSetHash}`
  if (modifier) return modifier
  return peerSetHash
}

/**
 * Split an "extra" string into a modifier and a peerSetHash.
 */
export function splitExtra(extra: string): {
  modifier?: string
  peerSetHash?: string
} {
  if (!extra) return {}

  // only peerSetHash is present, return it
  if (extra.startsWith(EXTRA_PEER_SET_DELIMITER)) {
    return { peerSetHash: extra }
  }

  // only modifier is present, return its value
  const idx = extra.indexOf(EXTRA_PEER_SET_DELIMITER)
  if (idx === -1) {
    return { modifier: extra }
  }

  // Both modifier and peerSetHash are present
  return {
    modifier: extra.slice(0, idx),
    peerSetHash: extra.slice(idx),
  }
}

/**
 * Reset internal caches. This should be used when options change since
 * they're not take into account in the memoization keys.
 */
export const resetCaches = () => {
  seenHydrated.clear()
  seenHydratedTuples.clear()
  seenSplitDepIDs.clear()
  seenTuples.clear()
}
