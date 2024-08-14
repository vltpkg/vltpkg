import t from 'tap'
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { GridItemData } from '@/components/explorer-grid/types.js'

// avoids rendering the internals of each component
const { SideItem } = await t.mockImport(
  '../../../src/components/explorer-grid/side-item.jsx',
  {
    '@/components/ui/badge.jsx': {
      Badge: 'gui-badge',
    },
    '@/components/ui/card.jsx': {
      Card: 'gui-card',
      CardHeader: 'gui-card-header',
      CardTitle: 'gui-card-title',
    },
  },
)

t.cleanSnapshot = s => html(s)

t.afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

t.test('SideItem render as dependent', async t => {
  const item = {
    id: '1',
    labels: ['prod'],
    name: 'item',
    title: 'item',
    version: '1.0.0',
    stacked: false,
    size: 1,
  } satisfies GridItemData
  render(<SideItem item={item} dependencies={false} />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('SideItem render as parent', async t => {
  const item = {
    id: '1',
    labels: ['prod'],
    name: 'item',
    title: 'item',
    version: '1.0.0',
    stacked: false,
    size: 1,
  } satisfies GridItemData
  render(
    <SideItem item={item} dependencies={false} highlight={true} />,
  )
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('SideItem render as two-stacked dependent', async t => {
  const item = {
    id: '1',
    labels: ['prod'],
    name: 'item',
    title: 'item',
    version: '1.0.0',
    stacked: true,
    size: 2,
  } satisfies GridItemData
  render(<SideItem item={item} dependencies={false} />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('SideItem render as multi-stacked dependent', async t => {
  const item = {
    id: '1',
    labels: ['prod'],
    name: 'item',
    title: 'item',
    version: '1.0.0',
    stacked: true,
    size: 5,
  } satisfies GridItemData
  render(<SideItem item={item} dependencies={false} />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('SideItem render as dependency', async t => {
  const item = {
    id: '1',
    labels: ['peer'],
    name: 'item',
    title: 'item',
    version: '1.0.0',
    stacked: false,
    size: 1,
  } satisfies GridItemData
  render(<SideItem item={item} dependencies={true} />)
  t.matchSnapshot(window.document.body.innerHTML)
})

t.test('SideItem render as dependency with long name', async t => {
  const item = {
    id: '1',
    labels: ['peer'],
    name: 'lorem-ipsum-dolor-sit-amet-consectetur-adipiscing-elit-sed-do-eiusmod-tempor-incididunt-ut-labore-et-dolore-magna-aliqua-ut-enim-ad-minim-veniam-quis-nostrud-exercitation',
    title:
      'lorem-ipsum-dolor-sit-amet-consectetur-adipiscing-elit-sed-do-eiusmod-tempor-incididunt-ut-labore-et-dolore-magna-aliqua-ut-enim-ad-minim-veniam-quis-nostrud-exercitation',
    version: '1.0.0',
    stacked: false,
    size: 1,
  } satisfies GridItemData
  render(<SideItem item={item} dependencies={true} />)
  t.matchSnapshot(window.document.body.innerHTML)
})
