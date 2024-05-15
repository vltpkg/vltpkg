import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { error } from '@vltpkg/error-cause'
import {
  reverseDependencyTypes,
  DependencyTypeShort,
  Graph,
  Node,
  PackageInventory,
  PackageMetadata,
} from '@vltpkg/graph'
import { Spec } from '@vltpkg/spec'

interface LockfilePkg {
  id: string
  integrity?: string
  shasum?: string
}

interface LockfileNode {
  spec: string
  type: DependencyTypeShort
  pkg?: LockfilePkg
}

export interface LoadOptions {
  dir: string
  packageInventory: PackageInventory
}

export const load = ({
  dir,
  packageInventory,
}: LoadOptions): Graph => {
  const file = readFileSync(resolve(dir, 'vlt-lock.json'), {
    encoding: 'utf8',
  })
  const json = JSON.parse(file)
  const pkgs: Map<string, LockfilePkg> = new Map()
  const store: [string, unknown][] = Object.entries(json.store)
  for (const [id, value] of store) {
    let integrity
    let shasum
    if (typeof value === 'string') {
      const [i, s] = value.split('; ')
      if (i) {
        integrity = i
      } else if (s) {
        shasum = s
      }
    } else {
      throw error('Unexpected value found at lockfile store', {
        found: value,
      })
    }
    pkgs.set(id, { id, integrity, shasum })
  }

  const registries = new Map(Object.entries(json.registries))
  const findOrigin = (name: string) => {
    for (const host of registries.keys()) {
      if (name.startsWith(host)) {
        return host
      }
    }
  }

  const pre: LockfileNode[] = []
  const post: LockfileNode[] = []
  const postOrderIndexes: number[] = Array.from(
    Buffer.from(json.treeId, 'base64'),
  )

  json.tree.forEach((item: string, index: number) => {
    const [spec = '', type, pkgId] = item.split('; ')
    const node: LockfileNode = {
      spec,
      type: type as DependencyTypeShort,
      pkg: pkgId ? pkgs.get(pkgId) : undefined,
    }
    pre[index] = node

    // Reads post order index from the treeId and assigns the correct
    // index position in the post order array reference
    const postOrderIndex: number | undefined = postOrderIndexes[index]
    if (postOrderIndex == null) {
      throw error('Could not read index from tree id', {
        found: postOrderIndex,
      })
    }
    post[postOrderIndex] = node
  })

  let graph
  const seenPre: LockfileNode[] = []
  const unscoped = (name: string) => {
    const split = name.split('/')
    return split[split.length - 1]
  }
  const findParent = (node: LockfileNode) => {
    const postPos = post.indexOf(node)
    const candidates = post.slice(postPos + 1)
    for (const seen of seenPre) {
      if (candidates.indexOf(seen) > -1) {
        return seen
      }
    }
    /* c8 ignore next 2 */
    throw error('Could not find parent', { found: node })
  }
  for (const node of pre) {
    seenPre.unshift(node)

    let metadata: PackageMetadata | undefined
    let origin
    if (node.pkg) {
      origin = findOrigin(node.pkg.id)
      const originlessId =
        origin ?
          node.pkg.id.replace(new RegExp(`^${origin}`), '')
        : node.pkg.id
      const {
        name,
        bareSpec: version,
        type,
      } = Spec.parse(originlessId)
      const hostname =
        (origin && registries.get(origin)) ||
        'https://registry.npmjs.org'
      const dist =
        type === 'registry' && !!node.pkg.integrity ?
          {
            integrity: node.pkg.integrity,
            tarball: `${hostname}/${name}/-/${unscoped(name)}-${version}.tgz`,
          }
        : type === 'registry' && !!node.pkg.shasum ?
          {
            shasum: node.pkg.shasum,
            tarball: `${hostname}/${name}/-/${unscoped(name)}-${version}.tgz`,
          }
        : undefined
      metadata = {
        name,
        version,
        dist,
      }
    }

    // place root node
    if (node === pre[0]) {
      if (!metadata) {
        throw error('Missing root package metadata')
      }
      delete metadata.dist
      graph = new Graph(metadata, packageInventory, dir)
      continue
    }

    /* c8 ignore next 3 */
    if (!graph) {
      throw error('Missing root node')
    }

    const parent: LockfileNode = findParent(node)
    const fromNode: Node | undefined =
      parent.pkg?.id ?
        graph.pkgNodes.get(parent.pkg.id)
      : /* c8 ignore next */ undefined

    /* c8 ignore next 3 */
    if (!fromNode) {
      throw error('Could not find node', { found: parent.pkg?.id })
    }

    const type = reverseDependencyTypes.get(node.type)
    if (!type) {
      throw error('Dependency type not found', { found: node.type })
    }

    graph.placePackage(
      fromNode,
      type,
      Spec.parse(node.spec),
      metadata,
      undefined,
      origin,
    )
  }

  /* c8 ignore next 3 */
  if (!graph) {
    throw error('Could not load graph', { path: dir })
  }

  return graph
}
