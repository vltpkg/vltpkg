import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { Results } from '@/components/explorer-grid/results/index.tsx'
import { useResultsStore } from '@/components/explorer-grid/results/context.tsx'
import { joinDepIDTuple } from '@vltpkg/dep-id'

import type { ResultsStore } from '@/components/explorer-grid/results/context.tsx'
import type { GridItemData } from '@/components/explorer-grid/types.ts'

vi.mock('@/components/explorer-grid/results/context.tsx', () => ({
  useResultsStore: vi.fn(),
  ResultsProvider: 'gui-results-provider',
}))

vi.mock('@/components/explorer-grid/results/result-item.tsx', () => ({
  ResultItem: 'gui-result-item',
}))

vi.mock(
  '@/components/explorer-grid/results/empty-results-state.tsx',
  () => ({
    EmptyResultsState: 'gui-empty-results-state',
  }),
)

vi.mock('@/components/explorer-grid/results/sort.tsx', () => ({
  ResultsSort: 'gui-results-sort',
}))

vi.mock(
  '@/components/explorer-grid/results/page-navigation.tsx',
  () => ({
    ResultsPaginationNavigation: 'gui-results-pagination-navigation',
  }),
)

vi.mock(
  '@/components/explorer-grid/results/page-options.tsx',
  () => ({
    ResultPageOptions: 'gui-result-page-options',
  }),
)

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('Results renders an empty state when there are no items', () => {
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
    return <Results allItems={mockItems} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('Results Displays items', () => {
  const mockItems: GridItemData[] = [
    {
      id: joinDepIDTuple(['registry', '', 'a@1.0.0']),
      name: 'a',
      version: '1.0.0',
      insights: {},
      toJSON() {},
    } as unknown as GridItemData,
    {
      id: joinDepIDTuple(['registry', '', 'b@1.0.0']),
      name: 'b',
      version: '1.0.0',
      insights: {},
      toJSON() {},
    } as unknown as GridItemData,
    {
      id: joinDepIDTuple(['registry', '', 'c@1.0.0']),
      name: 'c',
      version: '1.0.0',
      insights: {},
      toJSON() {},
    } as unknown as GridItemData,
  ]

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
    return <Results allItems={mockItems} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
