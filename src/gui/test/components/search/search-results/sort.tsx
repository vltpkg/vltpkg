import { vi, test, expect, afterEach, beforeEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { SearchResultsSort } from '@/components/search/search-results/sort.tsx'

const mockUseSearchResultsStore = vi.fn()

vi.mock('@/state/search-results.ts', () => ({
  useSearchResultsStore: (selector: (state: unknown) => unknown) =>
    mockUseSearchResultsStore(selector),
}))

vi.mock('lucide-react', () => ({
  ChevronUp: 'gui-chevron-up-icon',
  ChevronDown: 'gui-chevron-down-icon',
  Sparkles: 'gui-sparkles-icon',
  TrendingUp: 'gui-trending-up-icon',
  Shield: 'gui-shield-icon',
  Wrench: 'gui-wrench-icon',
  Calendar: 'gui-calendar-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeEach(() => {
  const defaultState = {
    sortBy: 'relevance' as const,
    sortDir: 'desc' as const,
    setSort: vi.fn(),
    setSortDir: vi.fn(),
    isLoading: false,
    results: [{ package: { name: 'mock' } }],
  }

  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(defaultState),
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('renders sort menu', () => {
  const { container } = render(<SearchResultsSort />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders sort menu with relevance selected descending', () => {
  const state = {
    sortBy: 'relevance' as const,
    sortDir: 'desc' as const,
    setSort: vi.fn(),
    setSortDir: vi.fn(),
    isLoading: false,
    results: [{ package: { name: 'mock' } }],
  }

  mockUseSearchResultsStore.mockClear()
  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(state),
  )

  const { container } = render(<SearchResultsSort />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders sort menu with popularity selected ascending', () => {
  const state = {
    sortBy: 'popularity' as const,
    sortDir: 'asc' as const,
    setSort: vi.fn(),
    setSortDir: vi.fn(),
    isLoading: false,
    results: [{ package: { name: 'mock' } }],
  }

  mockUseSearchResultsStore.mockClear()
  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(state),
  )

  const { container } = render(<SearchResultsSort />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders sort menu with quality selected', () => {
  const state = {
    sortBy: 'quality' as const,
    sortDir: 'desc' as const,
    setSort: vi.fn(),
    setSortDir: vi.fn(),
    isLoading: false,
    results: [{ package: { name: 'mock' } }],
  }

  mockUseSearchResultsStore.mockClear()
  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(state),
  )

  const { container } = render(<SearchResultsSort />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders sort menu with no results', () => {
  const state = {
    sortBy: 'relevance' as const,
    sortDir: 'desc' as const,
    setSort: vi.fn(),
    setSortDir: vi.fn(),
    isLoading: false,
    results: [],
  }

  mockUseSearchResultsStore.mockClear()
  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(state),
  )

  const { container } = render(<SearchResultsSort />)
  expect(container.innerHTML).toMatchSnapshot()
})
