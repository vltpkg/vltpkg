import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec/browser'
import type { EdgeLike, NodeLike } from '@vltpkg/graph'
import { ExplorerGrid } from '@/components/explorer-grid/index.jsx'
import { load } from '@/state/load-graph.js'
import type { RawNode } from '@/state/types.js'
import { Query } from '@vltpkg/query'

vi.mock('@/components/explorer-grid/empty-results-state.jsx', () => ({
  EmptyResultsState: 'gui-empty-results-state',
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

test('explorer-grid render default', async () => {
  render(<ExplorerGrid />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('explorer-grid with results', async () => {
  const Container = () => {
    const updateEdges = useStore(state => state.updateEdges)
    const updateNodes = useStore(state => state.updateNodes)
    const rootNode = {
      id: joinDepIDTuple(['file', '.']),
      name: 'root',
      version: '1.0.0',
    } as NodeLike
    const aNode = {
      id: joinDepIDTuple(['registry', '', 'a@1.0.0']),
      name: 'a',
      version: '1.0.0',
    } as NodeLike
    const bNode = {
      id: joinDepIDTuple(['registry', '', 'b@1.0.0']),
      name: 'b',
      version: '1.0.0',
    } as NodeLike
    const nodes = [rootNode, aNode, bNode]
    const edges = [
      {
        from: rootNode,
        to: aNode,
        type: 'prod',
        spec: Spec.parse('a', '^1.0.0'),
        name: 'a',
      } as EdgeLike,
      {
        from: rootNode,
        to: bNode,
        type: 'dev',
        spec: Spec.parse('b', '^1.0.0'),
        name: 'b',
      } as EdgeLike,
    ]
    updateEdges(edges)
    updateNodes(nodes)
    return <ExplorerGrid />
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('explorer-grid with stack', async () => {
  const Container = () => {
    const updateEdges = useStore(state => state.updateEdges)
    const updateNodes = useStore(state => state.updateNodes)
    const rootNode = {
      id: joinDepIDTuple(['file', '.']),
      name: 'root',
      version: '1.0.0',
    } as NodeLike
    const aNode = {
      id: joinDepIDTuple(['registry', '', 'a@1.0.0']),
      name: 'a',
      version: '1.0.0',
    } as NodeLike
    const bNode = {
      id: joinDepIDTuple(['registry', '', 'b@1.0.0']),
      name: 'b',
      version: '1.0.0',
    } as NodeLike
    const nodes = [rootNode, aNode, bNode]
    const edges = [
      {
        from: rootNode,
        to: aNode,
        type: 'prod',
        spec: Spec.parse('a', '^1.0.0'),
        name: 'a',
      } as EdgeLike,
      {
        from: rootNode,
        to: bNode,
        type: 'dev',
        spec: Spec.parse('b', '^1.0.0'),
        name: 'b',
      } as EdgeLike,
      {
        from: aNode,
        to: bNode,
        type: 'prod',
        spec: Spec.parse('b', '^1.0.0'),
        name: 'b',
      } as EdgeLike,
    ]
    updateEdges(edges)
    updateNodes(nodes)
    return <ExplorerGrid />
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('explorer-grid renders workspace with edges in', async () => {
  const { graph } = load({
    lockfile: {
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
  })
  const q = new Query({ graph, specOptions: {} })
  const result = await q.search(':project[name=b]')

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
