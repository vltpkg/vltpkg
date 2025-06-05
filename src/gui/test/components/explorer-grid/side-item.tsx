import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Spec } from '@vltpkg/spec/browser'
import { useGraphStore as useStore } from '@/state/index.ts'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import { SideItem } from '@/components/explorer-grid/side-item.tsx'

vi.mock('@/components/ui/badge.tsx', () => ({
  Badge: 'gui-badge',
}))
vi.mock('@/components/ui/card.tsx', () => ({
  Card: 'gui-card',
  CardDescription: 'gui-card-description',
  CardHeader: 'gui-card-header',
  CardTitle: 'gui-card-title',
}))
vi.mock('@/components/ui/dropdown-menu.tsx', () => ({
  DropdownMenu: 'gui-dropdown-menu',
  DropdownMenuTrigger: 'gui-dropdown-menu-trigger',
  DropdownMenuContent: 'gui-dropdown-menu-content',
  DropdownMenuItem: 'gui-dropdown-menu-item',
}))
vi.mock('@/components/ui/data-badge.tsx', () => ({
  DataBadge: 'gui-data-badge',
}))
vi.mock('lucide-react', async () => ({
  Ellipsis: 'gui-ellipsis',
  PackageMinus: 'gui-package-minus',
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
    spec: Spec.parse('item', '^1.0.0'),
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
    spec: Spec.parse('item', '^1.0.0'),
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
    spec: Spec.parse('item', '^1.0.0'),
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
    spec: Spec.parse('item', '^1.0.0'),
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
    spec: Spec.parse('item', '^1.0.0'),
  } satisfies GridItemData
  render(
    <SideItem item={item} dependencies={true} onSelect={() => {}} />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('SideItem render as aliased dependency', async () => {
  const item = {
    id: '1',
    labels: ['prod'],
    depName: 'aliased-item',
    name: 'item',
    title: 'item',
    version: '1.0.0',
    stacked: false,
    size: 1,
    spec: Spec.parse('aliased-item', 'npm:item@^1.0.0'),
  } satisfies GridItemData
  render(
    <SideItem item={item} dependencies={true} onSelect={() => {}} />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('SideItem render as git dependency', async () => {
  const item = {
    id: '1',
    labels: ['prod'],
    name: 'item',
    title: 'item',
    version: '1.0.0',
    stacked: false,
    size: 1,
    spec: Spec.parse('aliased-item', 'github:vltpkg/item'),
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
    spec: Spec.parse(
      'lorem-ipsum-dolor-sit-amet-consectetur-adipiscing-elit-sed-do-eiusmod-tempor-incididunt-ut-labore-et-dolore-magna-aliqua-ut-enim-ad-minim-veniam-quis-nostrud-exercitation',
      '^1.0.0',
    ),
  } satisfies GridItemData
  render(
    <SideItem item={item} dependencies={true} onSelect={() => {}} />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('SideItem render as workspace item', async () => {
  const item = {
    id: '1',
    labels: ['prod'],
    name: 'workspace-item',
    title: 'workspace-item',
    version: '1.0.0',
    stacked: false,
    size: 1,
    spec: Spec.parse('workspace-item', '^1.0.0'),
  } satisfies GridItemData
  render(
    <SideItem
      item={item}
      dependencies={false}
      isWorkspace={true}
      onSelect={() => {}}
    />,
  )
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
