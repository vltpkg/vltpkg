import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useResultsStore } from '@/components/explorer-grid/results/context.tsx'
import { ResultsPaginationNavigation } from '@/components/explorer-grid/results/page-navigation.tsx'

import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { ResultsStore } from '@/components/explorer-grid/results/context.tsx'

vi.mock('@/components/explorer-grid/results/context.tsx', () => ({
  useResultsStore: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  ChevronLeft: 'gui-chevron-left-icon',
  ChevronRight: 'gui-chevron-right-icon',
  MoreHorizontal: 'gui-more-horizontal-icon',
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

test('ResultsPaginationNavigation renders default', () => {
  const mockItems: GridItemData[] = []

  const mockState = {
    page: 1,
    totalPages: 0,
    pageSize: 25,
    pageItems: mockItems,
    allItems: mockItems,
    sortBy: 'alphabetical',
    sortDir: 'asc',
    setPage: vi.fn(),
    setSortBy: vi.fn(),
    setPageSize: vi.fn(),
    setSortDir: vi.fn(),
    setSort: vi.fn(),
  } satisfies ResultsStore

  vi.mocked(useResultsStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <ResultsPaginationNavigation />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
