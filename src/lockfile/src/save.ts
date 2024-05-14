import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Graph, Package } from '@vltpkg/graph'
import { createStorageTree } from './create-storage-tree.js'

const formatStore = (packages: Package[]) =>
  packages.map(pkg => `${pkg.id}; ${pkg.integrity || ''}`)

export interface SaveOptions {
  dir: string
  graph: Graph
}

export const save = ({ graph, dir }: SaveOptions) => {
  const packagesContent = [...graph.packages.values()]
  const content = JSON.stringify(
    {
      registries: {
        'npm:': 'https://registry.npmjs.org',
      },
      store: formatStore(packagesContent),
      tree: createStorageTree(graph, packagesContent),
    },
    null,
    2,
  )
  writeFileSync(resolve(dir, 'vltlock.json'), content)
}
