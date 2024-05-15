import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Graph, Package } from '@vltpkg/graph'
import { createStorageTree } from './create-storage-tree.js'

const formatStore = (packages: Iterable<Package>) => {
  const res: Record<string, string> = {}
  for (const pkg of packages) {
    let value = ''
    if (pkg.integrity) {
      value = pkg.integrity
    } else if (pkg.shasum) {
      value = `; ${pkg.shasum}`
    }
    res[pkg.id] = `${value}`
  }
  return res
}

export interface SaveOptions {
  dir: string
  graph: Graph
}

export const save = ({ graph, dir }: SaveOptions) => {
  const content = JSON.stringify(
    {
      registries: {
        'npm:': 'https://registry.npmjs.org',
      },
      store: formatStore(graph.packages.values()),
      ...createStorageTree(graph),
    },
    null,
    2,
  )
  writeFileSync(resolve(dir, 'vlt-lock.json'), content)
}
