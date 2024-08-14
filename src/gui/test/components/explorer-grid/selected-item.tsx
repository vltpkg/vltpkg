import t from 'tap'
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Spec, getOptions } from '@vltpkg/spec/browser'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { NodeLike } from '@vltpkg/graph'
import { useGraphStore as useStore } from '@/state/index.js'
import { GridItemData } from '@/components/explorer-grid/types.js'

// avoids rendering the internals of each component
const { SelectedItem } = await t.mockImport(
  '../../../src/components/explorer-grid/selected-item.jsx',
  {
    '@/components/ui/badge.jsx': {
      Badge: 'gui-badge',
    },
    '@/components/ui/card.jsx': {
      Card: 'gui-card',
      CardDescription: 'gui-card-description',
      CardHeader: 'gui-card-header',
      CardTitle: 'gui-card-title',
    },
  },
)

const specOptions = getOptions({
  registries: {
    custom: 'https://example.com',
  },
})

t.cleanSnapshot = s => html(s)

t.afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

t.test('SelectedItem render with item', async t => {
  const item = {
    name: 'item',
    title: 'item',
    version: '1.0.0',
    spec: Spec.parse('item', '^1.0.0', specOptions),
  } as unknown as GridItemData
  render(<SelectedItem item={item} />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('SelectedItem render with custom registry', async t => {
  const item = {
    name: 'item',
    title: 'item',
    version: '1.0.0',
    type: 'dev',
    spec: Spec.parse('item', 'custom:item@^1.0.0', specOptions),
    to: {
      name: 'item',
      version: '1.0.0',
      id: joinDepIDTuple(['registry', 'custom', 'item@1.0.0']),
    } as NodeLike,
    from: {
      name: 'parent',
      version: '1.0.0',
    } as NodeLike,
  } as unknown as GridItemData
  const Container = () => {
    const updateSpecOptions = useStore(
      state => state.updateSpecOptions,
    )
    updateSpecOptions(specOptions)
    return <SelectedItem item={item} />
  }
  render(<Container />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('SelectedItem render with scoped registry', async t => {
  const options = {
    ...specOptions,
    'scope-registries': {
      '@myscope': 'http://custom-scope',
    },
  }
  const item = {
    name: 'item',
    title: 'item',
    version: '1.0.0',
    type: 'dev',
    spec: Spec.parse('@myscope/item', '^1.0.0', options),
    to: {
      name: '@myscope/item',
      version: '1.0.0',
      id: joinDepIDTuple(['registry', '', '@myscope/item@1.0.0']),
    } as NodeLike,
    from: {
      name: 'parent',
      version: '1.0.0',
    } as NodeLike,
  } as unknown as GridItemData
  const Container = () => {
    const updateSpecOptions = useStore(
      state => state.updateSpecOptions,
    )
    updateSpecOptions(options)
    return <SelectedItem item={item} />
  }
  render(<Container />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('SelectedItem render with default git host', async t => {
  const item = {
    name: 'item',
    title: 'item',
    version: '1.0.0',
    type: 'dev',
    spec: Spec.parse('repo-item', 'github:a/b', specOptions),
    to: {
      name: 'repo-item',
      version: '1.0.0',
      id: joinDepIDTuple(['git', 'github:a/b', '']),
    } as NodeLike,
    from: {
      name: 'parent',
      version: '1.0.0',
    } as NodeLike,
  } as unknown as GridItemData
  const Container = () => {
    const updateSpecOptions = useStore(
      state => state.updateSpecOptions,
    )
    updateSpecOptions(specOptions)
    return <SelectedItem item={item} />
  }
  render(<Container />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('SelectedItem render connection lines', async t => {
  const item = {
    name: 'item',
    title: 'item',
    version: '1.0.0',
    spec: Spec.parse('item', '^1.0.0', specOptions),
    from: {
      name: 'parent',
      version: '1.0.0',
    } as NodeLike,
    to: {
      name: 'item',
      version: '1.0.0',
      id: joinDepIDTuple(['registry', '', 'item@1.0.0']),
      edgesIn: new Set([{}, {}]),
      edgesOut: new Map([['dep', {}]]),
    } as NodeLike,
  } as unknown as GridItemData
  render(<SelectedItem item={item} />)
  t.matchSnapshot(window.document.body.innerHTML)
})
