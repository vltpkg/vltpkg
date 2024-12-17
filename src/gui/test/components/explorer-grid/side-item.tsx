import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { type GridItemData } from '@/components/explorer-grid/types.js'
import { SideItem } from '@/components/explorer-grid/side-item.jsx'

vi.mock('@/components/ui/badge.jsx', () => ({
  Badge: 'gui-badge',
}))
vi.mock('@/components/ui/card.jsx', () => ({
  Card: 'gui-card',
  CardDescription: 'gui-card-description',
  CardHeader: 'gui-card-header',
  CardTitle: 'gui-card-title',
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

test('SideItem render as dependent', async () => {
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
    <SideItem item={item} dependencies={false} onSelect={() => {}} />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('SideItem render as parent', async () => {
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
    <SideItem
      item={item}
      dependencies={false}
      highlight={true}
      onSelect={() => {}}
    />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('SideItem render as two-stacked dependent', async () => {
  const item = {
    id: '1',
    labels: ['prod'],
    name: 'item',
    title: 'item',
    version: '1.0.0',
    stacked: true,
    size: 2,
  } satisfies GridItemData
  render(
    <SideItem item={item} dependencies={false} onSelect={() => {}} />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('SideItem render as multi-stacked dependent', async () => {
  const item = {
    id: '1',
    labels: ['prod'],
    name: 'item',
    title: 'item',
    version: '1.0.0',
    stacked: true,
    size: 5,
  } satisfies GridItemData
  render(
    <SideItem item={item} dependencies={false} onSelect={() => {}} />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('SideItem render as dependency', async () => {
  const item = {
    id: '1',
    labels: ['peer'],
    name: 'item',
    title: 'item',
    version: '1.0.0',
    stacked: false,
    size: 1,
  } satisfies GridItemData
  render(
    <SideItem item={item} dependencies={true} onSelect={() => {}} />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('SideItem render as dependency with long name', async () => {
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
  render(
    <SideItem item={item} dependencies={true} onSelect={() => {}} />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
