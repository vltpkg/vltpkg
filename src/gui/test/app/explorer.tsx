import t from 'tap'
import React from 'react'
import type { Query } from '@vltpkg/query'
import type { EdgeLike, GraphLike, NodeLike } from '@vltpkg/graph'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'

// avoids rendering the internals of each component
const { Explorer } = await t.mockImport(
  '../../src/app/explorer.jsx',
  {
    '@/components/search-bar.jsx': {
      SearchBar: 'gui-search-bar',
    },
    '@/components/ui/logo.jsx': {
      Logo: 'gui-logo',
    },
    '@/components/ui/title.jsx': {
      Title: 'gui-title',
    },
    '@/components/ui/card.jsx': {
      Card: 'gui-card',
      CardDescription: 'gui-card-description',
      CardHeader: 'gui-card-header',
      CardTitle: 'gui-card-title',
    },
    '@/components/explorer-grid/index.jsx': {
      ExplorerGrid: 'gui-explorer-grid',
    },
  },
)

t.cleanSnapshot = s => html(s)

t.afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

t.test('explorer render default', async t => {
  render(<Explorer />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('explorer has project root info', async t => {
  const Container = () => {
    const updateGraph = useStore(state => state.updateGraph)
    updateGraph({ projectRoot: '/path/to/project' } as GraphLike)
    return <Explorer />
  }
  render(<Container />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('update nodes and edges info on query change', async t => {
  render(<Explorer />)

  const nodes: NodeLike[] = []
  const edges: EdgeLike[] = []
  const q = {
    search() {
      return { nodes, edges }
    },
  }

  const Container = () => {
    const updateQ = useStore(state => state.updateQ)
    const updateQuery = useStore(state => state.updateQuery)
    updateQ(q as unknown as Query)
    updateQuery('#foo')
    return <Explorer />
  }
  render(<Container />)

  let edgesResult
  let nodesResult
  const Retrieve = () => {
    edgesResult = useStore(state => state.edges)
    nodesResult = useStore(state => state.nodes)
    return ''
  }
  render(<Retrieve />)

  t.strictSame(
    edgesResult,
    edges,
    'should update edges with result from query',
  )
  t.strictSame(
    nodesResult,
    nodes,
    'should update nodes with result from query',
  )
})
