import type { DepID, DepIDTuple } from '@vltpkg/dep-id'
import { splitDepID } from '@vltpkg/dep-id'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { Version } from '@vltpkg/semver'
import { mkdir, symlink } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import type { PathBase, PathScurry } from 'path-scurry'
import type { Graph } from '../graph.ts'
import type { Node } from '../node.ts'
import type { ReifyOptions } from './index.ts'

type InternalHoistOptions = Pick<
  ReifyOptions,
  'projectRoot' | 'scurry'
>

export const pickNodeToHoist = (
  nodes: Set<Node>,
): Node | undefined => {
  let pick: DepIDTuple | undefined = undefined
  let pickNode: Node | undefined = undefined
  for (const node of nodes) {
    if (node.importer || !node.inVltStore()) {
      continue
    }
    const id = splitDepID(node.id)
    if (!pick || !pickNode) {
      pick = id
      pickNode = node
      continue
    }

    // if one is a dep of an importer, privilege that one
    const impDep = [...node.edgesIn].some(n => n.from.importer)
    const pickImpDep = [...pickNode.edgesIn].some(
      n => n.from.importer,
    )
    if (impDep !== pickImpDep) {
      if (!pickImpDep) {
        pick = id
        pickNode = node
      }
      continue
    }

    if (id[0] === 'registry') {
      if (pick[0] !== 'registry') {
        pick = id
        pickNode = node
        continue
      }

      // both registry.

      // otherwise, privilege the higher-version dependency
      const pickVersion = pickNode.version
      const nodeVersion = node.version
      if (pickVersion) {
        if (!nodeVersion) continue
        if (
          Version.parse(nodeVersion).greaterThan(
            Version.parse(pickVersion),
          )
        ) {
          pick = id
          pickNode = node
        }
        continue
      } else if (nodeVersion) {
        pick = id
        pickNode = node
        continue
      }
    } else {
      // current node is not registry
      if (pick[0] === 'registry') continue
      // neither is pick node, select highest lexically sorted
      if (pickNode.id.localeCompare(node.id, 'en') > 0) {
        pick = id
        pickNode = node
      }
    }
  }

  return pickNode
}

export const internalHoist = async (
  graph: Graph,
  options: InternalHoistOptions,
  remover: RollbackRemove,
) => {
  // create a list of all the nodes that we need to hoist.
  // For each name, we prioritize registry deps over other types,
  // and higher versions over lower ones. In the case of non-registry
  // deps, we just pick the first item by sorting the DepIDs.
  const links = new Map<string, { id: DepID; name: string }>()
  for (const [name, nodes] of graph.nodesByName) {
    const pickNode = pickNodeToHoist(nodes)
    if (pickNode) {
      let picked = false
      if (pickNode.edgesIn.size > 0) {
        for (const edgeIn of pickNode.edgesIn) {
          const otherName = edgeIn.name
          if (otherName !== name && !links.has(otherName)) {
            picked = true
            links.set(otherName, pickNode)
          }
        }
      }
      if (!picked) {
        links.set(name, pickNode)
      }
    }
  }

  // now we have a list of everything to hoist
  // first, remove anything that is not what we want, and skip
  // anything that would be linking what we already indend to link.
  const { scurry } = options

  const hoistDir = scurry.cwd.resolve(
    'node_modules/.vlt/node_modules',
  )
  await mkdir(hoistDir.fullpath(), { recursive: true })

  const removes: Promise<void>[] = []
  for (const entry of await hoistDir.readdir()) {
    const name = entry.name
    // scoped package namespace
    if (name.startsWith('@')) {
      for (const pkg of await entry.readdir()) {
        await checkExisting(
          `${name}/${pkg.name}`,
          pkg,
          links,
          removes,
          scurry,
          remover,
        )
      }
    } else {
      await checkExisting(
        name,
        entry,
        links,
        removes,
        scurry,
        remover,
      )
    }
  }
  await Promise.all(removes)

  const symlinks: Promise<void>[] = []
  for (const [name, { name: nodeName, id }] of links) {
    const target = scurry.resolve(
      `node_modules/.vlt/${id}/node_modules/${nodeName}`,
    )
    const path = scurry.resolve(
      `node_modules/.vlt/node_modules/${name}`,
    )
    if (name.includes('/')) {
      await mkdir(dirname(path), { recursive: true })
    }
    symlinks.push(
      symlink(relative(dirname(path), target), path, 'dir'),
    )
  }
  await Promise.all(symlinks)
}

const checkExisting = async (
  name: string,
  entry: PathBase,
  links: Map<string, { name: string; id: DepID }>,
  removes: Promise<void>[],
  scurry: PathScurry,
  remover: RollbackRemove,
) => {
  const target = await entry.readlink()
  const { id } = links.get(name) /* c8 ignore next */ ?? {}
  if (
    !target ||
    !id ||
    target !==
      scurry.cwd.resolve(
        `node_modules/.vlt/${id}/node_modules/${name}`,
      )
  ) {
    removes.push(remover.rm(entry.fullpath()))
  } else {
    links.delete(name)
  }
}
