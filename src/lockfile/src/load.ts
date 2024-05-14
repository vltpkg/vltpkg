import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { error } from '@vltpkg/error-cause'
import {
  reverseDependencyTypes,
  DependencyTypeLong,
  DependencyTypeShort,
  Graph,
  Node,
  Package,
  PackageInventory,
  PackageMetadata,
} from '@vltpkg/graph'
import { Spec } from '@vltpkg/spec'

interface LockfilePkg {
  id: string
  integrity: string
}

interface LockfileNode {
  spec: string
  postOrder: number
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
  const file = readFileSync(resolve(dir, 'vltlock.json'), {
    encoding: 'utf8',
  })
  const json = JSON.parse(file)
  const pkgs: LockfilePkg[] = json.store.map((i: string) => {
    const [id, integrity] = i.split('; ')
    return { id, integrity }
  })

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
  json.tree.forEach((item: string, index: number) => {
    const [spec = '', type, postOrder, pkgId] = item.split('; ')
    const node: LockfileNode = {
      spec,
      type: type as DependencyTypeShort,
      postOrder: Number(postOrder),
      pkg: pkgId ? pkgs[Number(pkgId)] : undefined,
    }
    pre[index] = node
    post[Number(postOrder)] = node
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
        (origin && registries.get(origin)) || 'https://registry.npmjs.org'
      const dist =
        type === 'registry' && !!node.pkg.integrity ?
          {
            integrity: node.pkg.integrity,
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
