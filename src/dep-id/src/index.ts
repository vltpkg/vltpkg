import { error } from '@vltpkg/error-cause'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { Manifest } from '@vltpkg/types'

/**
 * Dependency IDs are a URI-encoded set of strings, separated
 * by a `';'` character.
 *
 * The first entry is always the specifier type. The rest depend on the
 * type. `git`, `registry`, and `workspace` entries have 3 fields, the rest
 * have 2.
 *
 * - `registry`: `'registry;<registry>;name@specifier'`
 *   The `<registry>` portion can be a known named registry name, or a
 *   url to a registry. If empty, it is the default registry.
 *   Examples:
 *   - `registry;;some-package@2.0.1`
 *   - `registry;npm;whatever@1.2.3'
 *   - `registry;http%3A%2F%2Fvlt.sh%2F;x@1.2.3`
 * - `git`: `'git;<git remote>;<git selector>`. For example:
 *   - `git;github:user/project;branchname`
 *   - `git;git%2Bssh%3A%2F%2Fuser%40host%3Aproject.git;semver:1.x`
 * - `workspace`: `'workspace;<name>;<specifier>`. For example:
 *   - `workspace;mything:*`
 *   - `workspace;library:1.x`
 * - `remote`: `'remote;<url>'`
 * - `file`: `'file;<path>`
 */
export type DepID =
  | `${'registry' | 'git' | 'workspace'};${string};${string}`
  | `${'remote' | 'file'};${string}`

/**
 * A {@link DepID}, split apart and URI-decoded
 */
export type DepIDTuple =
  | [type: 'registry', registry: string, registrySpec: string]
  | [type: 'git', gitRemote: string, gitSelector: string]
  | [type: 'file', path: string]
  | [type: 'remote', url: string]
  | [type: 'workspace', name: string, workspaceSpec: string]

/**
 * turn a {@link DepIDTuple} into a {@link DepID}
 */
export const joinDepIDTuple = (list: DepIDTuple): DepID => {
  const [type, first, second] = list
  const f = encode(first)
  switch (type) {
    case 'git':
    case 'registry':
    case 'workspace':
      return `${type};${f};${encode(second)}`
    default:
      return `${type};${f}`
  }
}

// allow @, but otherwise, escape everything urls do
const encode = (s: string): string =>
  encodeURIComponent(s).replace('%40', '@')

/**
 * turn a {@link DepID} into a {@link DepIDTuple}
 */
export const splitDepID = (id: string): DepIDTuple => {
  const [type, first = '', second] = id.split(';', 3)
  const f = decodeURIComponent(first)
  switch (type) {
    case 'git':
    case 'registry':
    case 'workspace':
      if (second === undefined) {
        throw error(`invalid ${type} id`, { found: id })
      }
      return [type, f, decodeURIComponent(second)]
    case 'file':
    case 'remote':
      return [type, f]
    default: {
      throw error('invalid DepID type', {
        found: type,
        validOptions: [
          'git',
          'file',
          'workspace',
          'remote',
          'registry',
        ],
      })
    }
  }
}

/**
 * Turn a {@link DepID} into a {@link Spec} object
 */
export const hydrate = (
  id: DepID,
  name = 'unknown',
  options: SpecOptions = {},
): Spec => hydrateTuple(splitDepID(id), name, options)

/**
 * Turn a {@link DepIDTuple} into a {@link Spec} object
 */
export const hydrateTuple = (
  tuple: DepIDTuple,
  name = 'unknown',
  options: SpecOptions = {},
) => {
  const [type, first, second] = tuple
  switch (type) {
    case 'remote': {
      if (!first)
        throw error('no remoteURL found on remote id', {
          found: tuple,
        })
      return Spec.parse(name, first)
    }
    case 'file': {
      if (!first) {
        throw error('no remoteURL found on remote id', {
          found: tuple,
        })
      }
      return Spec.parse(name, `file:${first}`, options)
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
        return Spec.parse(name, second)
      }
      if (!/^https?:\/\//.test(first)) {
        const reg = options.registries?.[first]
        if (first !== 'npm' && !reg) {
          throw error('named registry not found in options', {
            name: first,
            found: tuple,
          })
        }
        return Spec.parse(name, `${first}:${second}`, options)
      }
      return Spec.parse(name, `registry:${first}#${second}`, options)
    }
    case 'git': {
      if (!first) {
        throw error('no git remote in git ID', {
          found: tuple,
        })
      }
      if (second === undefined) {
        throw error('no git selector in git ID', {
          found: tuple,
        })
      }
      return Spec.parse(name, first + '#' + second, options)
    }
    case 'workspace': {
      if (second === undefined) {
        throw error('no name on workspace id', { found: tuple })
      }
      return Spec.parse(second, `workspace:${first}`, options)
    }
  }
}

// Strip out the default registry, there's no need to store that
const omitDefReg = (s?: string): string =>
  (
    !s ||
    s === 'https://registry.npmjs.org' ||
    s === 'https://registry.npmjs.org/'
  ) ?
    ''
  : s

/**
 * Get the {@link DepIDTuple} for a given {@link Spec} and {@link Manifest}.
 * The Manifest is used to get the name and version, if possible. If not found
 * in the manifest, registry ID types will use the name or bareSpec from the
 * specifier, so at least there's something to use later.
 */
export const getTuple = (spec: Spec, mani: Manifest): DepIDTuple => {
  const f = spec.final
  switch (f.type) {
    case 'registry': {
      return [
        f.type,
        f.namedRegistry ?? omitDefReg(f.registry),
        `${mani.name ?? spec.name}@${mani.version ?? spec.bareSpec}`,
      ]
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
        return [
          f.type,
          `${namedGitHost}:${namedGitHostPath}`,
          gitSelector,
        ]
      } else {
        return [f.type, gitRemote, gitSelector]
      }
    }
    case 'remote': {
      const { remoteURL } = f
      if (!remoteURL)
        throw error('no URL on remote specifier', { spec })
      return [f.type, remoteURL]
    }
    case 'file': {
      const { file } = f
      if (!file) throw error('no path on file specifier', { spec })
      return [f.type, f.bareSpec.substring('file:'.length)]
    }
    case 'workspace': {
      const { workspaceSpec } = f
      if (workspaceSpec === undefined) {
        throw error('invalid workspace: specifier', { spec })
      }
      return [f.type, f.name, workspaceSpec]
    }
  }
}

/**
 * Get the {@link DepID} for a given {@link Spec} and {@link Manifest}. The
 * Manifest is used to get the name and version, if possible. If not found in
 * the manifest, registry ID types will use the name or bareSpec from the
 * specifier, so at least there's something to use later.
 */
export const getId = (spec: Spec, mani: Manifest): DepID =>
  joinDepIDTuple(getTuple(spec, mani))
