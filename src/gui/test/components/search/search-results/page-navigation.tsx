import { vi, test, expect, afterEach, beforeEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { SearchResultsPaginationNavigation } from '@/components/search/search-results/page-navigation.tsx'

const mockUseSearchResultsStore = vi.fn()

vi.mock('@/state/search-results.ts', () => ({
  useSearchResultsStore: (selector: (state: unknown) => unknown) =>
    mockUseSearchResultsStore(selector),
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

beforeEach(() => {
  const defaultState = {
    page: 1,
    setPage: vi.fn(),
    total: 100,
    pageSize: 25,
    results: Array(25).fill({ package: { name: 'mock' } }),
  }

  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(defaultState),
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('renders pagination navigation', () => {
  const { container } = render(<SearchResultsPaginationNavigation />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders pagination on first page', () => {
  const state = {
    page: 1,
    setPage: vi.fn(),
    total: 100,
    pageSize: 25,
    results: Array(25).fill({ package: { name: 'mock' } }),
  }

  mockUseSearchResultsStore.mockClear()
  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(state),
  )

  const { container } = render(<SearchResultsPaginationNavigation />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders pagination on last page', () => {
  const state = {
    page: 4,
    setPage: vi.fn(),
    total: 100,
    pageSize: 25,
    results: Array(25).fill({ package: { name: 'mock' } }),
  }

  mockUseSearchResultsStore.mockClear()
  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(state),
  )

  const { container } = render(<SearchResultsPaginationNavigation />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders pagination with many pages', () => {
  const state = {
    page: 5,
    setPage: vi.fn(),
    total: 500,
    pageSize: 25,
    results: Array(25).fill({ package: { name: 'mock' } }),
  }

  mockUseSearchResultsStore.mockClear()
  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(state),
  )

  const { container } = render(<SearchResultsPaginationNavigation />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders pagination with no results', () => {
  const state = {
    page: 1,
    setPage: vi.fn(),
    total: 0,
    pageSize: 25,
    results: [],
  }

  mockUseSearchResultsStore.mockClear()
  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(state),
  )

  const { container } = render(<SearchResultsPaginationNavigation />)
  expect(container.innerHTML).toMatchSnapshot()
})
