import { error } from '@vltpkg/error-cause'

export const delimiter: Delimiter = '·'
export type Delimiter = '·'

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
      return `${delimiter}${f}${delimiter}${encode(second)}${extra ? `${delimiter}${encode(extra)}` : ''}`
    case 'git':
      return `${type}${delimiter}${f}${delimiter}${encode(second)}${extra ? `${delimiter}${encode(extra)}` : ''}`
    default:
      return `${type}${delimiter}${f}${second ? `${delimiter}${encode(second)}` : ''}`
  }
}

// allow @, but otherwise, escape everything urls do
const encode = (s: string): string =>
  encodeURIComponent(s)
    .replaceAll('%40', '@')
    .replaceAll('%2f', '§')
    .replaceAll('%2F', '§')

/**
 * turn a {@link DepID} into a {@link DepIDTuple}
 */
export const splitDepID = (id: string): DepIDTuple => {
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
      const t: DepIDTuple = [
        type || 'registry',
        f,
        decodeURIComponent(second),
      ]
      if (extra) t.push(decodeURIComponent(extra))
      return t
    }
    case 'file':
    case 'remote':
    case 'workspace': {
      const t: DepIDTuple = [type, f]
      if (second) t.push(decodeURIComponent(second))
      return t
    }
    default: {
      throw error('invalid DepID type', {
        found: type,
        validOptions: ['git', 'file', 'workspace', 'remote', ''],
      })
    }
  }
}
