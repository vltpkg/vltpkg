import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { SelectedItem } from '@/components/explorer-grid/selected-item/index.tsx'
import type { GridItemData } from '@/components/explorer-grid/types'
import type {
  QueryResponseEdge,
  QueryResponseNode,
} from '@vltpkg/query'

vi.mock('@/components/explorer-grid/selected-item/item.tsx', () => ({
  Item: 'gui-selected-item',
}))

vi.mock('@/components/explorer-grid/header.tsx', () => ({
  GridHeader: 'gui-grid-header',
}))

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/index.tsx',
  () => ({
    DependencySideBar: 'gui-dependency-sidebar',
  }),
)

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('SelectedItem renders default', () => {
  const mockItem = {
    id: '1',
    labels: ['prod'],
    name: 'item',
    title: 'item',
    version: '1.0.0',
    sameItems: false,
    stacked: false,
    size: 1,
  } satisfies GridItemData

  const Container = () => {
    return <SelectedItem item={mockItem} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SelectedItem renders with dependencies', () => {
  const mockNode = (
    nodeName: string,
    edgesOut: QueryResponseEdge[] = [],
    edgesIn: QueryResponseEdge[] = [],
  ): QueryResponseNode => {
    return {
      name: nodeName,
      version: '1.0.0',
      insights: {},
      edgesOut: new Map(edgesOut.map(edge => [edge.name, edge])),
      edgesIn: new Set(edgesIn),
    } as unknown as QueryResponseNode
  }

  const nodeB = mockNode('b')
  const nodeC = mockNode('c')

  const edgeAB: QueryResponseEdge = {
    name: 'b',
    spec: { bareSpec: '1.0.0' },
    to: nodeB,
    type: 'prod',
  } as unknown as QueryResponseEdge

  const edgeAC: QueryResponseEdge = {
    name: 'c',
    spec: { bareSpec: '2.0.0' },
    to: nodeC,
    type: 'dev',
  } as unknown as QueryResponseEdge

  const nodeA = mockNode('a', [edgeAB, edgeAC])

  const mockItem = {
    id: '1',
    name: 'item',
    title: 'item',
    version: '1.0.0',
    stacked: false,
    size: 1,
    to: nodeA,
  } satisfies GridItemData

  const Container = () => {
    return <SelectedItem item={mockItem} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SelectedItem renders with workspaces', () => {
  const mockNode = (
    nodeName: string,
    edgesOut: QueryResponseEdge[] = [],
    edgesIn: QueryResponseEdge[] = [],
  ): QueryResponseNode => {
    return {
      name: nodeName,
      version: '1.0.0',
      insights: {},
      edgesOut: new Map(edgesOut.map(edge => [edge.name, edge])),
      edgesIn: new Set(edgesIn),
      mainImporter: true,
      graph: {
        importers: [
          {
            id: 'workspace1',
            name: 'workspace1',
            version: '1.0.0',
          },
          {
            id: 'workspace2',
            name: 'workspace2',
            version: '2.0.0',
          },
        ],
      },
    } as unknown as QueryResponseNode
  }

  const nodeA = mockNode('a')

  const mockItem = {
    id: '1',
    name: 'item',
    title: 'item',
    version: '1.0.0',
    stacked: false,
    size: 1,
    to: nodeA,
  } satisfies GridItemData

  const Container = () => {
    return <SelectedItem item={mockItem} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SelectedItem updates query when clicking workspace item', () => {
  const mockNode = (
    nodeName: string,
    edgesOut: QueryResponseEdge[] = [],
    edgesIn: QueryResponseEdge[] = [],
  ): QueryResponseNode => {
    return {
      name: nodeName,
      version: '1.0.0',
      insights: {},
      edgesOut: new Map(edgesOut.map(edge => [edge.name, edge])),
      edgesIn: new Set(edgesIn),
      mainImporter: true,
      graph: {
        importers: [
          {
            id: 'workspace1',
            name: 'workspace1',
            version: '1.0.0',
          },
        ],
      },
    } as unknown as QueryResponseNode
  }

  const nodeA = mockNode('a')

  const mockItem = {
    id: '1',
    name: 'item',
    title: 'item',
    version: '1.0.0',
    stacked: false,
    size: 1,
    to: nodeA,
  } satisfies GridItemData

  const Container = () => {
    return <SelectedItem item={mockItem} />
  }

  const { getByText } = render(<Container />)

  const workspaceItem = getByText('workspace1')
  fireEvent.click(workspaceItem)

  let query = ''
  const RetrieveQuery = () => (
    (query = useStore(state => state.query)), ''
  )
  render(<RetrieveQuery />)

  expect(query).toBe(':project#workspace1')
})
