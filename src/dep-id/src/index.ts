import { error } from '@vltpkg/error-cause'
import {
  currentDefaultRegistryName,
  defaultRegistryName,
  Spec,
} from '@vltpkg/spec'
import {
  resetCaches as browserResetCaches,
  splitDepID,
} from './browser.ts'
import type { SpecOptions } from '@vltpkg/spec'
import type { DepID, DepIDTuple } from './browser.ts'

// Here we re-export the browser-specific parts of the implementation
// we disable the eslint rules for import/export since we are intentionally
// re-exporting the `hydrate` and `hydrateTuple` functions to make sure they
// use the Node.js-specific `Spec.parse` method that relies on internal node
// modules like `util` and `path` that are not isomorphic.
// eslint-disable-next-line import/export
export * from './browser.ts'

const seenHydrated = new Map<string, Spec>()
/**
 * Turn a {@link DepID} into a {@link Spec} object using
 * the Node.js-specific `Spec.parse` method.
 */
// eslint-disable-next-line import/export
export const hydrate = (
  id: DepID,
  name?: string,
  options: SpecOptions = {},
): Spec => {
  // memoized entries return early
  const cacheKey = (name ?? '') + id
  const seen = seenHydrated.get(cacheKey)
  if (seen) return seen
  const res = hydrateTuple(splitDepID(id), name, options)
  seenHydrated.set(cacheKey, res)
  return res
}

const seenHydratedTuples = new Map<string, Spec>()
/**
 * Turn a {@link DepIDTuple} into a {@link Spec} object using
 * the Node.js-specific `Spec.parse` method.
 */
// eslint-disable-next-line import/export
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

/**
 * Reset internal caches. This should be used when options change since
 * they're not take into account in the memoization keys.
 */
// eslint-disable-next-line import/export
export const resetCaches = () => {
  seenHydrated.clear()
  seenHydratedTuples.clear()
  browserResetCaches()
}
