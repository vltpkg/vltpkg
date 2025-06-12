import { describe, test, expect, afterEach, assert } from 'vitest'
import {
  cleanup,
  render,
  fireEvent,
  screen,
} from '@testing-library/react'
import html from 'diffable-html'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { QueryResponseNode } from '@vltpkg/query'
import { useGraphStore as useStore } from '@/state/index.ts'
import { ResultItem } from '@/components/explorer-grid/results/result-item.tsx'
import type { GridItemData } from '@/components/explorer-grid/types.ts'

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('ResultItem render with item', async () => {
  const item = {
    id: '1',
    labels: ['prod'],
    name: 'item',
    title: 'item',
    version: '1.0.0',
    sameItems: false,
    stacked: false,
    size: 1,
  } satisfies GridItemData
  render(<ResultItem item={item} />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('ResultItem render with type', async () => {
  const item = {
    id: '1',
    labels: ['prod'],
    type: 'prod',
    to: {
      insights: {},
    } as QueryResponseNode,
    from: {
      name: 'from',
      version: '1.0.0',
      id: joinDepIDTuple(['registry', '', 'from@1.0.0']),
      insights: {},
    } as QueryResponseNode,
    name: 'item',
    title: 'item',
    version: '1.0.0',
    sameItems: false,
    stacked: false,
    size: 1,
  } satisfies GridItemData
  render(<ResultItem item={item} />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('ResultItem render stacked two', async () => {
  const item = {
    id: '1',
    labels: ['dev'],
    name: 'two-edges-stacked',
    title: 'two-edges-stacked',
    version: '1.0.0',
    sameItems: false,
    stacked: true,
    size: 2,
  } satisfies GridItemData
  render(<ResultItem item={item} />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('ResultItem render stacked many', async () => {
  const item = {
    id: '1',
    labels: ['peer'],
    name: 'many-edges-stacked',
    title: 'many-edges-stacked',
    version: '1.1.1',
    sameItems: false,
    stacked: true,
    size: 5,
  } satisfies GridItemData
  render(<ResultItem item={item} />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('ResultItem render missing version and labels', async () => {
  const item = {
    id: '1',
    name: 'item',
    title: 'item',
    sameItems: false,
    stacked: false,
    size: 1,
  } as GridItemData
  render(<ResultItem item={item} />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

describe('ResultItem updates query store value', () => {
  test('stacked item', async () => {
    const item = {
      id: '1',
      labels: ['prod'],
      name: 'item',
      title: 'item',
      version: '1.0.0',
      sameItems: false,
      stacked: true,
      size: 2,
      to: {
        name: 'item',
        version: '1.0.0',
        insights: {},
      } as QueryResponseNode,
    } satisfies GridItemData
    render(<ResultItem item={item} />)

    fireEvent.click(screen.getByRole('link'))

    let query = ''
    const RetrieveQuery = () => (
      (query = useStore(state => state.query)),
      ''
    )
    render(<RetrieveQuery />)

    assert.deepEqual(
      query,
      ':root#item',
      'should append item and version in order to narrow & show stacked items',
    )
  })

  test('importer item', async () => {
    const item = {
      id: '1',
      labels: ['prod'],
      name: 'my-item',
      title: 'my-item',
      version: '1.0.0',
      sameItems: false,
      stacked: false,
      size: 1,
      to: {
        name: 'my-item',
        version: '1.0.0',
        importer: true,
        insights: {},
      } as QueryResponseNode,
    } satisfies GridItemData
    render(<ResultItem item={item} />)

    fireEvent.click(screen.getByRole('link'))

    let query = ''
    const RetrieveQuery = () => (
      (query = useStore(state => state.query)),
      ''
    )
    render(<RetrieveQuery />)

    assert.deepEqual(
      query,
      ':project#my-item',
      'should prefix with :project followed by the name of the importer',
    )
  })

  test('has parent', async () => {
    const item = {
      id: '1',
      labels: ['prod'],
      name: 'item',
      title: 'item',
      version: '1.0.0',
      sameItems: false,
      stacked: false,
      size: 1,
      to: {
        insights: {},
      } as QueryResponseNode,
      from: {
        name: 'parent',
        version: '1.0.0',
        insights: {},
      } as QueryResponseNode,
    } satisfies GridItemData
    render(<ResultItem item={item} />)

    fireEvent.click(screen.getByRole('link'))

    let query = ''
    const RetrieveQuery = () => (
      (query = useStore(state => state.query)),
      ''
    )
    render(<RetrieveQuery />)

    assert.deepEqual(
      query,
      '#parent > :root',
      'should prefix the parent name and version',
    )
  })

  test('add suffix', async () => {
    const item = {
      id: '1',
      labels: ['prod'],
      name: 'item',
      title: 'item',
      version: '1.0.0',
      sameItems: false,
      stacked: false,
      size: 1,
      to: {
        name: 'item',
        version: '1.0.0',
        insights: {},
      } as QueryResponseNode,
    } satisfies GridItemData
    render(<ResultItem item={item} />)

    fireEvent.click(screen.getByRole('link'))

    let query = ''
    const RetrieveQuery = () => (
      (query = useStore(state => state.query)),
      ''
    )
    render(<RetrieveQuery />)

    assert.deepEqual(
      query,
      ':root#item',
      'should add name and version suffix',
    )
  })
})
