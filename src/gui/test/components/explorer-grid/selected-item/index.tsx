import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { SelectedItem } from '@/components/explorer-grid/selected-item/index.tsx'
import type { GridItemData } from '@/components/explorer-grid/types'

vi.mock('@/components/explorer-grid/selected-item/item.tsx', () => ({
  Item: 'gui-selected-item',
}))

vi.mock('@/components/explorer-grid/header.tsx', () => ({
  GridHeader: 'gui-grid-header',
}))

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/index.tsx',
  () => ({
    DependencySideBar: 'gui-dependency-sidebar',
  }),
)

vi.mock(
  '@/components/explorer-grid/overview-sidebar/index.tsx',
  () => ({
    OverviewSidebar: 'gui-overview-sidebar',
  }),
)

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('SelectedItem renders default', () => {
  const mockItem = {
    id: '1',
    labels: ['prod'],
    name: 'item',
    title: 'item',
    version: '1.0.0',
    sameItems: false,
    stacked: false,
    size: 1,
  } satisfies GridItemData

  const Container = () => {
    return <SelectedItem item={mockItem} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
