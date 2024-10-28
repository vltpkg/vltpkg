import { test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec/browser'
import { EdgeLike, NodeLike } from '@vltpkg/graph'
import { ExplorerGrid } from '@/components/explorer-grid/index.jsx'

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
