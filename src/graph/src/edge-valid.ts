import { join, relative } from 'node:path/posix'
import { splitDepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { parse } from '@vltpkg/semver'
import { Edge } from './edge.js'
import { Dependency } from './dependencies.js'

/**
 * Check if a given {@link Edge} satisfies the requirements of a given
 * {@link Dependency}. If no `dependency` is provided then the edge is going
 * to run the validity checks on itself.
 */
export const edgeValid = (edge: Edge, dependency?: Dependency) => {
  const type = dependency?.type || edge.type
  const spec = dependency?.spec || edge.spec

  // invalid if type differs
  if (type !== edge.type) return false

  // if the edge has no node linked to then it's
  // only valid in case it's an optional dependency
  if (!edge.to) return edge.optional

  // retrieve additional info from the node.id
  const tuple = splitDepID(edge.to.id)
  const [depIDType] = tuple

  switch (spec.type) {
    case 'registry': {
      const reg = tuple[1]
      if (depIDType !== 'registry') return false

      if (!reg) {
        // invalid if missing custom registry and not using default value
        if (edge.spec.registry !== edge.spec.options.registry)
          return false
      } else {
        // invalid if the registry found in the node does not match
        // the value defined in the edge spec
        const namedRegistry = spec.options.registries[reg]
        if (namedRegistry && namedRegistry !== edge.spec.registry)
          return false
        else if (!namedRegistry && reg !== edge.spec.registry)
          return false
      }

      // valid if there's no range value to compare
      if (!spec.range) return true

      // valid if satisfies the `edge.to` node version satisfies
      // the range requirement from the dependency spec
      const version = parse(edge.to.version ?? '')
      if (!version) return false
      return spec.range.test(version)
    }

    case 'file': {
      if (depIDType !== 'file') return false

      // invalid if the edge spec does not look like a file
      if (spec.file === undefined) return false

      // invalid if filepath has changed
      if (edge.spec.file !== spec.file) return false

      // valid when path of resulting node + edge file
      // matches the path of the node.id
      const idPath = tuple[1]
      const resolvedPath = join(edge.from.location, spec.file)
      // using path.posix.relative to compare paths in order to accomodate
      // for preppending ./ and any trailing / differences in between
      // node.location, id values and spec.file
      if (!relative(idPath, resolvedPath)) return true

      return false
    }

    case 'remote': {
      if (depIDType !== 'remote') return false

      // valid as long as the url value found in the node id
      // matches the value defined in the dependency spec
      const url = tuple[1]
      return spec.remoteURL === url
    }

    /* c8 ignore start */
    case 'git': {
      if (depIDType !== 'git') return false
      // TODO: git types
      return true
    }
    /* c8 ignore stop */

    case 'workspace': {
      if (depIDType !== 'workspace') return false

      // invalid if location does not match node dep id path value
      const path = tuple[1]
      // using path.posix.relative to compare paths in order to accomodate
      // for preppending ./ and any trailing / differences in between
      // node.location and the path value retrieved from dep id
      if (relative(path, edge.to.location)) return false

      // valid if there's no range value to compare
      if (!spec.range) return true

      // valid if satisfies the `edge.to` node version satisfies
      // the range requirement from the dependency spec
      const version = parse(edge.to.version ?? '')
      if (!version) return false
      return spec.range.test(version)
    }

    /* c8 ignore start */
    default: {
      throw error('Invalid spec type found', { spec: edge.spec })
    }
  }
  /* c8 ignore stop */
}
