import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { FocusedAside } from '@/components/explorer-grid/selected-item/focused-view/aside.tsx'

import type { GridItemData } from '@/components/explorer-grid/types.ts'

vi.mock('react-router', () => ({
  useParams: () => ({
    tab: 'overview',
    subTab: undefined,
  }),
}))

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/index.tsx',
  () => ({
    DependencySideBar: 'gui-dependency-sidebar',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/aside/index.tsx',
  () => ({
    AsideOverview: 'gui-aside-overview',
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

test('FocusedAside renders default', () => {
  const mockDependencies: GridItemData[] = []
  const mockUninstalledDependencies: GridItemData[] = []
  const mockOnDependencyClick = vi.fn()

  const Container = () => {
    return (
      <FocusedAside
        dependencies={mockDependencies}
        onDependencyClick={mockOnDependencyClick}
        uninstalledDependencies={mockUninstalledDependencies}
      />
    )
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
