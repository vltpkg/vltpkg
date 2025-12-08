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
): GridItemData[] => {
  const items: GridItemData[] = []
  const seenEdges = new Map<DepID, Set<EdgeLoose>>()
  const seenItems = new Map<string, GridItemData>()
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
      edge.to?.id ?
        `${edge.to.projectRoot}#${baseDepID(edge.to.id)}`
      : undefined,
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
        id: `${edge.from?.id || ''}${title}`,
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
    const baseID = baseDepID(id_)
    const id = `${edge.to?.projectRoot || ''}#${baseID}`
    // items resolving to the same package will be stacked
    const item = seenItems.get(id)
    if (item && stackable) {
      const seen = seenEdges.get(baseID)
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
      //const id = baseDepID(edge.to.id)
      const data: GridItemData = {
        ...edge,
        id: `${edge.to?.projectRoot || ''}#${edge.from?.id || ''}#${edge.to?.id || title}`,
        labels,
        title,
        version: edge.to ? stringifyNode(edge.to) : '',
        sameItems,
        stacked: false,
        size: 1,
      }
      items.push(data)
      seenEdges.set(baseID, new Set([edge]))
      seenItems.set(id, data)
    }
  }

  // this is a singled out, selected node
  const item = items[0]
  if (item && items.length === 1) {
    item.title = item.to?.name || 'Missing package'
    item.version = item.to?.version || ''
    item.breadcrumbs = getBreadcrumbs(query)
  }

  return items.sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

export const ExplorerGrid = ({
  isLoading,
  loadedQuery,
}: {
  isLoading?: boolean
  loadedQuery?: string
}) => {
  const edges = useGraphStore(state => state.edges)
  const nodes = useGraphStore(state => state.nodes)
  const query = useGraphStore(state => state.query)
  const stamp = useGraphStore(state => state.stamp)
  const graphStamp = useGraphStore(state => state.graphStamp)
  const isExternalPackage = useGraphStore(
    state => state.isExternalPackage,
  )
  const externalPackageSpec = useGraphStore(
    state => state.externalPackageSpec,
  )
  const specOptions = useGraphStore(state => state.specOptions)

  // For external npm packages, create a mock item directly
  if (isExternalPackage && externalPackageSpec) {
    const spec = Spec.parseArgs(externalPackageSpec, specOptions)
    const externalItem: GridItemData = {
      id: externalPackageSpec,
      name: spec.name,
      title: spec.name, // Display just the package name, not package@version
      version: spec.bareSpec || '', // Store the version if we have it
      labels: [],
      sameItems: false,
      stacked: false,
      size: 1,
      type: 'prod',
      spec,
      from: undefined,
      to: undefined,
      breadcrumbs: undefined,
    }

    // Key forces remount to reset loading state when navigating between packages
    return (
      <SelectedItem key={externalPackageSpec} item={externalItem} />
    )
  }

  const items = getItemsData(edges, nodes, query)

  // Show loading when:
  // 1. Graph is reloading (project switch)
  // 2. Query is explicitly loading
  // 3. The loaded query doesn't match the current query (prevents FOUC)
  const hasQuery = query.trim().length > 0
  // If we have a query, but it doesn't match what we've loaded, show loading.
  // This handles initial load (loadedQuery is undefined) and transitions.
  const queryMismatch = hasQuery && query !== loadedQuery

  if (stamp !== graphStamp || isLoading || queryMismatch) {
    return null
  }

  if (items.length === 1 && items[0]) {
    // Key forces remount to reset loading state when navigating between items
    return <SelectedItem key={items[0].id} item={items[0]} />
  }

  // Show Results component for both empty and populated results
  // The Results component will handle the empty state internally
  return <Results allItems={items} />
}
