import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec/browser'
import { ExplorerGrid } from '@/components/explorer-grid/index.tsx'
import { transfer } from '@vltpkg/graph/browser'
import { Query } from '@vltpkg/query'
import { useResultsStore } from '@/components/explorer-grid/results/context.tsx'

import type { ResultsStore } from '@/components/explorer-grid/results/context.tsx'
import type {
  QueryResponseEdge,
  QueryResponseNode,
} from '@vltpkg/query'
import type { RawNode } from '@/state/types.ts'
import type { GridItemData } from '@/components/explorer-grid/types'

vi.mock('lucide-react', () => ({
  Package: 'gui-package-icon',
}))

vi.mock('@/components/explorer-grid/results/result-item.tsx', () => ({
  ResultItem: 'gui-result-item',
}))

vi.mock(
  '@/components/explorer-grid/results/empty-results-state.tsx',
  () => ({
    EmptyResultsState: 'gui-empty-results-state',
  }),
)

vi.mock('@/components/explorer-grid/results/sort.tsx', () => ({
  ResultsSort: 'gui-results-sort',
}))

vi.mock('@/components/explorer-grid/results/context.tsx', () => ({
  ResultsProvider: 'gui-results-provider',
  useResultsStore: vi.fn(),
}))

vi.mock(
  '@/components/explorer-grid/results/page-navigation.tsx',
  () => ({
    ResultsPaginationNavigation: 'gui-results-pagination-navigation',
  }),
)

vi.mock(
  '@/components/explorer-grid/results/page-options.tsx',
  () => ({
    ResultPageOptions: 'gui-result-page-options',
  }),
)

vi.mock('@/components/explorer-grid/side-item.tsx', () => ({
  SideItem: 'gui-side-item',
}))

vi.mock('@/components/explorer-grid/selected-item/index.tsx', () => ({
  SelectedItem: 'gui-selected-item',
}))

vi.mock('@/components/explorer-grid/header.tsx', () => ({
  GridHeader: 'gui-grid-header',
}))

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/index.tsx',
  () => ({
    DependencySideBar: 'gui-dependency-side-bar',
  }),
)

vi.mock(
  '@/components/explorer-grid/results/empty-results-state.tsx',
  () => ({
    EmptyResultsState: 'gui-empty-results-state',
  }),
)

vi.mock('@/components/ui/badge.tsx', () => ({
  Badge: 'gui-badge',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('ExplorerGrid render default', async () => {
  const mockState = {
    page: 1,
    totalPages: 0,
    pageSize: 25,
    pageItems: [],
    allItems: [],
    sortBy: 'alphabetical',
    setPage: vi.fn(),
    setSortBy: vi.fn(),
    setPageSize: vi.fn(),
  } satisfies ResultsStore

  vi.mocked(useResultsStore).mockImplementation(selector =>
    selector(mockState),
  )

  render(<ExplorerGrid />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('ExplorerGrid with results', async () => {
  const rootNode = {
    id: joinDepIDTuple(['file', '.']),
    name: 'root',
    version: '1.0.0',
    insights: {},
    toJSON() {},
  } as QueryResponseNode
  const aNode = {
    id: joinDepIDTuple(['registry', '', 'a@1.0.0']),
    name: 'a',
    version: '1.0.0',
    insights: {},
    toJSON() {},
  } as QueryResponseNode
  const bNode = {
    id: joinDepIDTuple(['registry', '', 'b@1.0.0']),
    name: 'b',
    version: '1.0.0',
    insights: {},
    toJSON() {},
  } as QueryResponseNode

  const mockState = {
    page: 1,
    totalPages: 0,
    pageSize: 25,
    pageItems: [
      rootNode as unknown as GridItemData,
      aNode as unknown as GridItemData,
      bNode as unknown as GridItemData,
    ],
    allItems: [
      rootNode as unknown as GridItemData,
      aNode as unknown as GridItemData,
      bNode as unknown as GridItemData,
    ],
    sortBy: 'alphabetical',
    setPage: vi.fn(),
    setSortBy: vi.fn(),
    setPageSize: vi.fn(),
  } satisfies ResultsStore

  vi.mocked(useResultsStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    const updateEdges = useStore(state => state.updateEdges)
    const updateNodes = useStore(state => state.updateNodes)
    const nodes = [rootNode, aNode, bNode]
    const edges: QueryResponseEdge[] = [
      {
        from: rootNode,
        to: aNode,
        type: 'prod',
        spec: Spec.parse('a', '^1.0.0'),
        name: 'a',
      },
      {
        from: rootNode,
        to: bNode,
        type: 'dev',
        spec: Spec.parse('b', '^1.0.0'),
        name: 'b',
      },
    ]
    updateEdges(edges)
    updateNodes(nodes)
    return <ExplorerGrid />
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('ExplorerGrid with stack', async () => {
  const rootNode = {
    id: joinDepIDTuple(['file', '.']),
    name: 'root',
    version: '1.0.0',
    insights: {},
    toJSON() {},
  } as QueryResponseNode
  const aNode = {
    id: joinDepIDTuple(['registry', '', 'a@1.0.0']),
    name: 'a',
    version: '1.0.0',
    insights: {},
    toJSON() {},
  } as QueryResponseNode
  const bNode = {
    id: joinDepIDTuple(['registry', '', 'b@1.0.0']),
    name: 'b',
    version: '1.0.0',
    insights: {},
    toJSON() {},
  } as QueryResponseNode

  const mockState = {
    page: 1,
    totalPages: 0,
    pageSize: 25,
    pageItems: [
      rootNode as unknown as GridItemData,
      aNode as unknown as GridItemData,
      bNode as unknown as GridItemData,
    ],
    allItems: [
      rootNode as unknown as GridItemData,
      aNode as unknown as GridItemData,
      bNode as unknown as GridItemData,
    ],
    sortBy: 'alphabetical',
    setPage: vi.fn(),
    setSortBy: vi.fn(),
    setPageSize: vi.fn(),
  } satisfies ResultsStore

  vi.mocked(useResultsStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    const updateEdges = useStore(state => state.updateEdges)
    const updateNodes = useStore(state => state.updateNodes)
    const nodes = [rootNode, aNode, bNode]
    const edges: QueryResponseEdge[] = [
      {
        from: rootNode,
        to: aNode,
        type: 'prod',
        spec: Spec.parse('a', '^1.0.0'),
        name: 'a',
      },
      {
        from: rootNode,
        to: bNode,
        type: 'dev',
        spec: Spec.parse('b', '^1.0.0'),
        name: 'b',
      },
      {
        from: aNode,
        to: bNode,
        type: 'prod',
        spec: Spec.parse('b', '^1.0.0'),
        name: 'b',
      },
    ]
    updateEdges(edges)
    updateNodes(nodes)
    return <ExplorerGrid />
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('ExplorerGrid renders workspace with edges in', async () => {
  const { graph } = transfer.load({
    lockfile: {
      lockfileVersion: 0,
      options: {},
      nodes: {},
      edges: {
        'workspace·a b': 'prod workspace:* workspace·b',
      },
    },
    importers: [
      {
        id: joinDepIDTuple(['file', '.']),
        name: 'root',
        version: '1.0.0',
        manifest: { name: 'root', version: '1.0.0' },
        importer: true,
        mainImporter: true,
        location: '.',
        dev: false,
        optional: false,
      } as RawNode,
      {
        id: joinDepIDTuple(['workspace', 'a']),
        name: 'a',
        version: '1.0.0',
        manifest: { name: 'a', version: '1.0.0' },
        importer: true,
        mainImporter: false,
        location: './a',
        dev: false,
        optional: false,
      } as RawNode,
      {
        id: joinDepIDTuple(['workspace', 'b']),
        name: 'b',
        version: '1.0.0',
        manifest: { name: 'b', version: '1.0.0' },
        importer: true,
        mainImporter: false,
        location: './b',
        dev: false,
        optional: false,
      } as RawNode,
    ],
    projectInfo: {
      tools: ['vlt'],
      vltInstalled: true,
    },
    securityArchive: undefined,
  })
  const q = new Query({
    graph,
    specOptions: {},
    securityArchive: undefined,
  })
  const result = await q.search(':project[name=b]', {
    signal: new AbortController().signal,
  })

  const Container = () => {
    const updateEdges = useStore(state => state.updateEdges)
    const updateNodes = useStore(state => state.updateNodes)
    updateEdges(result.edges)
    updateNodes(result.nodes)
    return <ExplorerGrid />
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
