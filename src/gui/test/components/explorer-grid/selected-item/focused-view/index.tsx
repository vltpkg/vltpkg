import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { FocusedView } from '@/components/explorer-grid/selected-item/focused-view/index.tsx'

import type { GridItemData } from '@/components/explorer-grid/types.ts'

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  () => ({
    useSelectedItemStore: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/item-header.tsx',
  () => ({
    ItemHeader: 'gui-item-header',
  }),
)

vi.mock('@/components/explorer-grid/selected-item/item.tsx', () => ({
  SelectedItemTabs: 'gui-selected-item-tabs',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/focused-view/aside.tsx',
  () => ({
    FocusedAside: 'gui-focused-aside',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/focused-view/focused-button.tsx',
  () => ({
    FocusButton: 'gui-focused-button',
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

test('FocusedView renders default', () => {
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

  const mockDependencies: GridItemData[] = []
  const mockUninstalledDependencies: GridItemData[] = []
  const mockOnDependencyClick = vi.fn(() => () => undefined)

  const Container = () => {
    return (
      <FocusedView
        item={mockItem}
        dependencies={mockDependencies}
        onDependencyClick={mockOnDependencyClick}
        uninstalledDependencies={mockUninstalledDependencies}
      />
    )
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
