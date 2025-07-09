import { error } from '@vltpkg/error-cause'
import { Spec } from '@vltpkg/spec'
import { splitDepID } from './browser.ts'
import type { SpecOptions } from '@vltpkg/spec'
import type { DepID, DepIDTuple } from './browser.ts'

// Here we re-export the browser-specific parts of the implementation
// we disable the eslint rules for import/export since we are intentionally
// re-exporting the `hydrate` and `hydrateTuple` functions to make sure they
// use the Node.js-specific `Spec.parse` method that relies on internal node
// modules like `util` and `path` that are not isomorphic.
// eslint-disable-next-line import/export
export * from './browser.ts'

/**
 * Turn a {@link DepID} into a {@link Spec} object using
 * the Node.js-specific `Spec.parse` method.
 */
// eslint-disable-next-line import/export
export const hydrate = (
  id: DepID,
  name?: string,
  options: SpecOptions = {},
): Spec => hydrateTuple(splitDepID(id), name, options)

/**
 * Turn a {@link DepIDTuple} into a {@link Spec} object using
 * the Node.js-specific `Spec.parse` method.
 */
// eslint-disable-next-line import/export
export const hydrateTuple = (
  tuple: DepIDTuple,
  name?: string,
  options: SpecOptions = {},
) => {
  const [type, first, second] = tuple
  switch (type) {
    case 'remote': {
      if (!first)
        throw error('no remoteURL found on remote id', {
          found: tuple,
        })
      return Spec.parse(name ?? '(unknown)', first)
    }
    case 'file': {
      if (!first) {
        throw error('no file path found on remote id', {
          found: tuple,
        })
      }
      return Spec.parse(name ?? '(unknown)', `file:${first}`, options)
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
      if (!first) {
        // just a normal name@version on the default registry
        const s = Spec.parse(second)
        if (name && s.name !== name) {
          return Spec.parse(`${name}@npm:${second}`)
        } else {
          return s
        }
      }
      if (!/^https?:\/\//.test(first)) {
        const reg = options.registries?.[first]
        if (first !== 'npm' && !reg) {
          throw error('named registry not found in options', {
            name: first,
            found: tuple,
          })
        }
        return Spec.parse(
          name ?? '(unknown)',
          `${first}:${second}`,
          options,
        )
      }
      const s = Spec.parse(
        name ?? '(unknown)',
        `registry:${first}#${second}`,
        options,
      )
      return name && s.final.name !== name ?
          Spec.parse(s.final.name + '@' + s.bareSpec)
        : s
    }
    case 'git': {
      if (!first) {
        throw error('no git remote in git ID', {
          found: tuple,
        })
      }
      return Spec.parse(
        name ?? '(unknown)',
        first + '#' + second,
        options,
      )
    }
    case 'workspace': {
      if (!first) {
        throw error('no name/path on workspace id', { found: tuple })
      }
      return name && name !== first ?
          Spec.parse(name, `workspace:${first}@*`, options)
        : Spec.parse(first, `workspace:*`, options)
    }
  }
}
