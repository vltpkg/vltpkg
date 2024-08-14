import t from 'tap'
import React from 'react'
import {
  cleanup,
  render,
  fireEvent,
  screen,
} from '@testing-library/react'
import html from 'diffable-html'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { NodeLike } from '@vltpkg/graph'
import { useGraphStore as useStore } from '@/state/index.js'
import { ResultItem } from '@/components/explorer-grid/result-item.jsx'
import { GridItemData } from '@/components/explorer-grid/types.js'

t.cleanSnapshot = s => html(s)

t.afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

t.test('ResultItem render with item', async t => {
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
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('ResultItem render with type', async t => {
  const item = {
    id: '1',
    labels: ['prod'],
    type: 'prod',
    to: {} as NodeLike,
    from: {
      name: 'from',
      version: '1.0.0',
      id: joinDepIDTuple(['registry', '', 'from@1.0.0']),
    } as NodeLike,
    name: 'item',
    title: 'item',
    version: '1.0.0',
    sameItems: false,
    stacked: false,
    size: 1,
  } satisfies GridItemData
  render(<ResultItem item={item} />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('ResultItem render stacked two', async t => {
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
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('ResultItem render stacked many', async t => {
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
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('ResultItem render missing version and labels', async t => {
  const item = {
    id: '1',
    name: 'item',
    title: 'item',
    sameItems: false,
    stacked: false,
    size: 1,
  } as GridItemData
  render(<ResultItem item={item} />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('ResultItem updates query store value', async t => {
  await t.test('stacked item', async t => {
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
      } as NodeLike,
    } satisfies GridItemData
    render(<ResultItem item={item} />)

    fireEvent.click(screen.getByRole('link'))

    let query = ''
    const RetrieveQuery = () => (
      (query = useStore(state => state.query)), ''
    )
    render(<RetrieveQuery />)

    t.strictSame(
      query,
      ':project > *[name="item"][version="1.0.0"]',
      'should append item and version in order to narrow & show stacked items',
    )
  })

  await t.test('importer item', async t => {
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
      } as NodeLike,
    } satisfies GridItemData
    render(<ResultItem item={item} />)

    fireEvent.click(screen.getByRole('link'))

    let query = ''
    const RetrieveQuery = () => (
      (query = useStore(state => state.query)), ''
    )
    render(<RetrieveQuery />)

    t.strictSame(
      query,
      ':project[name="my-item"]',
      'should prefix with :project followed by the name of the importer',
    )
  })

  await t.test('has parent', async t => {
    const item = {
      id: '1',
      labels: ['prod'],
      name: 'item',
      title: 'item',
      version: '1.0.0',
      sameItems: false,
      stacked: false,
      size: 1,
      to: {} as NodeLike,
      from: {
        name: 'parent',
        version: '1.0.0',
      } as NodeLike,
    } satisfies GridItemData
    render(<ResultItem item={item} />)

    fireEvent.click(screen.getByRole('link'))

    let query = ''
    const RetrieveQuery = () => (
      (query = useStore(state => state.query)), ''
    )
    render(<RetrieveQuery />)

    t.strictSame(
      query,
      '[name="parent"][version="1.0.0"] > :is(:project > *)',
      'should prefix the parent name and version',
    )
  })

  await t.test('add suffix', async t => {
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
      } as NodeLike,
    } satisfies GridItemData
    render(<ResultItem item={item} />)

    fireEvent.click(screen.getByRole('link'))

    let query = ''
    const RetrieveQuery = () => (
      (query = useStore(state => state.query)), ''
    )
    render(<RetrieveQuery />)

    t.strictSame(
      query,
      ':project > *[name="item"][version="1.0.0"]',
      'should add name and version suffix',
    )
  })
})
