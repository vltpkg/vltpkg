import {
  test,
  assert,
  expect,
  vi,
  afterAll,
  afterEach,
  beforeAll,
} from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import type {
  Query,
  QueryResponseEdge,
  QueryResponseNode,
} from '@vltpkg/query'
import type { EdgeLike, GraphLike, NodeLike } from '@vltpkg/graph'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { Explorer } from '@/app/explorer.tsx'
import { joinDepIDTuple } from '@vltpkg/dep-id/browser'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('@/components/query-bar/index.tsx', () => ({
  QueryBar: 'gui-query-bar',
}))

vi.mock('@/components/ui/logo.tsx', () => ({
  Logo: 'gui-logo',
}))

vi.mock('@/components/ui/title.tsx', () => ({
  Title: 'gui-title',
}))

vi.mock('@/components/ui/card.tsx', () => ({
  Card: 'gui-card',
  CardDescription: 'gui-card-description',
  CardHeader: 'gui-card-header',
  CardTitle: 'gui-card-title',
}))

vi.mock('@/components/explorer-grid/index.tsx', () => ({
  ExplorerGrid: 'gui-explorer-grid',
}))

vi.mock('@/components/explorer-grid/setup-project.tsx', () => ({
  SetupProject: 'gui-setup-project',
}))

vi.mock('@/components/explorer-grid/root-button.tsx', () => ({
  RootButton: 'gui-root-button',
}))

export const restHandlers = [
  http.get('/graph.json', () => {
    return HttpResponse.json({
      specOptions: {
        registry: 'https://registry.npmjs.org',
      },
      hasDashboard: false,
      importers: [
        {
          id: joinDepIDTuple(['file', '.']),
          name: 'root',
          version: '1.0.0',
          mainImporter: true,
          importer: true,
          location: '.',
          dev: false,
          optional: false,
          manifest: { name: 'root', version: '1.0.0' },
        },
      ],
      lockfile: { options: {}, nodes: [], edges: [] },
      projectInfo: {
        tools: ['vlt'],
        vltInstalled: true,
      },
    })
  }),
]

const server = setupServer(...restHandlers)

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeAll(() => server.listen())

afterEach(() => {
  server.resetHandlers()
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

afterAll(() => server.close())

test('render default', async () => {
  const Container = () => {
    const updateProjectInfo = useStore(
      state => state.updateProjectInfo,
    )
    updateProjectInfo({ tools: ['vlt'], vltInstalled: true })
    return <Explorer />
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('explorer has project root info', async () => {
  const Container = () => {
    const updateProjectInfo = useStore(
      state => state.updateProjectInfo,
    )
    const updateGraph = useStore(state => state.updateGraph)
    updateProjectInfo({ tools: ['vlt'], vltInstalled: true })
    updateGraph({ projectRoot: '/path/to/project' } as GraphLike)
    return <Explorer />
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('update nodes and edges info on query change', async () => {
  const nodes: NodeLike[] = []
  const edges: EdgeLike[] = []
  const q = {
    search() {
      return { nodes, edges }
    },
  }

  const Container = () => {
    const updateGraph = useStore(state => state.updateGraph)
    const updateProjectInfo = useStore(
      state => state.updateProjectInfo,
    )
    const updateQ = useStore(state => state.updateQ)
    const updateQuery = useStore(state => state.updateQuery)
    updateGraph({ projectRoot: '/path/to/project' } as GraphLike)
    updateProjectInfo({ tools: ['vlt'], vltInstalled: true })
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

  assert.deepEqual(
    edgesResult,
    edges,
    'should update edges with result from query',
  )
  assert.deepEqual(
    nodesResult,
    nodes,
    'should update nodes with result from query',
  )
})

test('render no results if search throws', async () => {
  const q = {
    search() {
      throw new Error('ERR')
    },
  }

  const Container = () => {
    const updateNodes = useStore(state => state.updateNodes)
    const updateEdges = useStore(state => state.updateEdges)
    const updateGraph = useStore(state => state.updateGraph)
    const updateProjectInfo = useStore(
      state => state.updateProjectInfo,
    )
    const updateQ = useStore(state => state.updateQ)
    const updateQuery = useStore(state => state.updateQuery)

    // sets a node and edge just to test it got reset later on
    const node = {
      name: 'foo',
      version: '1.0.0',
    } as unknown as QueryResponseNode
    updateNodes([node])
    updateEdges([
      {
        name: 'foo',
        to: node,
      } as unknown as QueryResponseEdge,
    ])

    updateGraph({ projectRoot: '/path/to/project' } as GraphLike)
    updateProjectInfo({ tools: ['vlt'], vltInstalled: true })
    updateQ(q as unknown as Query)
    updateQuery('#bar')
    return <Explorer />
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()

  await new Promise(resolve => setTimeout(resolve, 0))

  let edgesResult
  let nodesResult
  const Retrieve = () => {
    edgesResult = useStore(state => state.edges)
    nodesResult = useStore(state => state.nodes)
    return ''
  }
  render(<Retrieve />)

  // results should now have been reset to empty
  assert.deepEqual(
    edgesResult,
    [],
    'should update edges with empty result',
  )
  assert.deepEqual(
    nodesResult,
    [],
    'should update nodes with empty result',
  )
})

test('explorer not vlt installed', async () => {
  const Container = () => {
    const updateGraph = useStore(state => state.updateGraph)
    const updateProjectInfo = useStore(
      state => state.updateProjectInfo,
    )
    updateGraph({ projectRoot: '/path/to/project' } as GraphLike)
    updateProjectInfo({ tools: [], vltInstalled: false })
    return <Explorer />
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
