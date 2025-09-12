import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useResultsStore } from '@/components/explorer-grid/results/context.tsx'
import { ResultsPaginationNavigation } from '@/components/explorer-grid/results/page-navigation.tsx'

import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { ResultsStore } from '@/components/explorer-grid/results/context.tsx'

vi.mock('@/components/ui/pagination.tsx', () => ({
  Pagination: 'gui-pagination',
  PaginationContent: 'gui-pagination-content',
  PaginationItem: 'gui-pagination-item',
  PaginationPrevious: 'gui-pagination-previous',
  PaginationEllipsis: 'gui-pagination-ellipses',
  PaginationLink: 'gui-pagination-link',
  PaginationNext: 'gui-pagination-next',
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

test('ResultsPaginationNavigation renders default', () => {
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
    return <ResultsPaginationNavigation />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
