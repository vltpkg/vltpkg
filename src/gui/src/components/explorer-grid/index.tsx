import { baseDepID } from '@vltpkg/dep-id/browser'
import { Results } from '@/components/explorer-grid/results/index.tsx'
import { SelectedItem } from '@/components/explorer-grid/selected-item/index.tsx'
import { useGraphStore } from '@/state/index.ts'
import { Spec } from '@vltpkg/spec/browser'
import { stringifyNode } from '@vltpkg/graph/browser'
import { getBreadcrumbs } from '@/components/navigation/crumb-nav.tsx'

import type {
  QueryResponseEdge,
  QueryResponseNode,
} from '@vltpkg/query'
import type {
  EdgeLoose,
  GridItemData,
} from '@/components/explorer-grid/types.ts'
import type { State } from '@/state/types.ts'
import type { DepID } from '@vltpkg/dep-id'

export type ExplorerOptions = {
  projectRoot?: string
}

const getItemsData = (
  edges: QueryResponseEdge[],
  nodes: QueryResponseNode[],
  query: State['query'],
) => {
  const items: GridItemData[] = []
  const seenEdges = new Map<DepID, Set<EdgeLoose>>()
  const seenItems = new Map<DepID, GridItemData>()
  const allEdges: EdgeLoose[] = [...edges]

  // creates empty edge references for importer nodes
  for (const node of nodes) {
    if (node.importer) {
      const name = node.name || ''
      allEdges.unshift({
        name,
        type: 'prod',
        spec: Spec.parse(
          name || '',
          node.mainImporter ? 'file:.' : `workspace:*`,
        ),
        from: undefined,
        to: node,
      })
    }
  }

  const ids = new Set<string | undefined>(
    allEdges.map(edge =>
      edge.to?.id ? baseDepID(edge.to.id) : undefined,
    ),
  )
  ids.delete(undefined)
  const stackable = ids.size > 1
  const sameItems = ids.size === 1

  for (const edge of allEdges) {
    if (sameItems && !edge.from && allEdges.length > 1) continue
    const id_ = edge.to?.id
    const titleVersion =
      edge.spec?.bareSpec ? `@${edge.spec.bareSpec}` : ''
    const title =
      edge.from ? `${edge.name}${titleVersion}` : edge.name
    // will not stack missing packages
    if (!id_) {
      items.push({
        ...edge,
        id: `${edge.from?.id}${title}`,
        labels: edge.type && edge.type !== 'prod' ? [edge.type] : [],
        title,
        version: 'Missing package',
        sameItems,
        stacked: false,
        size: 1,
      })
      continue
    }
    // retrieve the target node base depID
    const id = baseDepID(id_)
    // items resolving to the same package will be stacked
    const item = seenItems.get(id)
    if (item && stackable) {
      const seen = seenEdges.get(id)
      seen?.add(edge)
      item.size += 1
      item.stacked = true
      if (title !== item.title) {
        if (item.spec?.bareSpec !== edge.spec?.bareSpec) {
          item.title = item.name
        }
        if (item.name !== edge.name) {
          item.title = `${item.name} and ${item.size} more`
        }
      }
    } else {
      // when nothing was seen, create a new item
      const nodeType: string | undefined =
        edge.to?.dev ? 'dev'
        : edge.to?.optional ? 'optional'
        : undefined
      const workspaceLabel: string | undefined =
        edge.to?.importer && !edge.to.mainImporter ?
          'workspace'
        : undefined
      const labelNames: string[] =
        edge.to?.edgesIn ?
          Array.from(edge.to.edgesIn).map(e => e.type)
        : []
      const labels = Array.from(
        new Set(
          [...labelNames, nodeType, workspaceLabel].filter(
            Boolean,
          ) as string[],
        ),
      ).filter(i => i !== 'prod')
      const data: GridItemData = {
        ...edge,
        id: `${edge.from?.id}${edge.to?.id}` || title,
        labels,
        title,
        version: edge.to ? stringifyNode(edge.to) : '',
        sameItems,
        stacked: false,
        size: 1,
      }
      items.push(data)
      seenEdges.set(id, new Set([edge]))
      seenItems.set(id, data)
    }
  }

  // this is a singled out, selected node
  const item = items[0]
  if (item && items.length === 1) {
    item.title = item.to?.name || 'Missing package'
    item.version = item.to?.version ? `v${item.to.version}` : ''
    item.breadcrumbs = getBreadcrumbs(query)
  }

  return items.sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

export const ExplorerGrid = () => {
  const edges = useGraphStore(state => state.edges)
  const nodes = useGraphStore(state => state.nodes)
  const query = useGraphStore(state => state.query)
  const items = getItemsData(edges, nodes, query)
  return (
    <section>
      {items.length === 1 && items[0] ?
        <SelectedItem item={items[0]} />
      : <Results items={items} />}
    </section>
  )
}
