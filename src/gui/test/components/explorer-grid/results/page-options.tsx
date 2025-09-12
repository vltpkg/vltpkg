import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useResultsStore } from '@/components/explorer-grid/results/context.tsx'
import { ResultPageOptions } from '@/components/explorer-grid/results/page-options.tsx'

import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { ResultsStore } from '@/components/explorer-grid/results/context.tsx'

vi.mock('@/components/ui/dropdown-menu.tsx', () => ({
  DropdownMenu: 'gui-dropdown-menu',
  DropdownMenuTrigger: 'gui-dropdown-menu-trigger',
  DropdownMenuItem: 'gui-dropdown-menu-item',
  DropdownMenuGroup: 'gui-dropdown-menu-group',
  DropdownMenuLabel: 'gui-dropdown-menu-label',
  DropdownMenuContent: 'gui-dropdown-menu-content',
}))

vi.mock('lucide-react', () => ({
  ChevronRight: 'gui-chevron-right-icon',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/explorer-grid/results/context.tsx', () => ({
  useResultsStore: vi.fn(),
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

test('ResultPageOptions renders default', () => {
  const mockItems: GridItemData[] = []

  const mockState = {
    page: 1,
    totalPages: 0,
    pageSize: 25,
    pageItems: mockItems,
    allItems: mockItems,
    sortBy: 'alphabetical',
    setPage: vi.fn(),
    setSortBy: vi.fn(),
    setPageSize: vi.fn(),
  } satisfies ResultsStore

  vi.mocked(useResultsStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <ResultPageOptions />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
