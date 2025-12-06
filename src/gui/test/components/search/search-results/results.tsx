import { vi, test, expect, afterEach, beforeEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { SearchResults } from '@/components/search/search-results/results.tsx'

const mockUseSearchResultsStore = vi.fn()

vi.mock('@/state/search-results.ts', () => ({
  useSearchResultsStore: (selector: (state: unknown) => unknown) =>
    mockUseSearchResultsStore(selector),
}))

vi.mock(
  '@/components/search/search-results/use-sync-url.tsx',
  () => ({
    useSyncSearchResultsURL: vi.fn(),
  }),
)

vi.mock('@/components/hooks/use-debounce', () => ({
  useDebounce: vi.fn((value: string) => value),
}))

vi.mock('@/components/hooks/use-keydown', () => ({
  useKeyDown: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  Search: 'gui-search-icon',
  CircleAlert: 'gui-circle-alert-icon',
  PackageSearch: 'gui-package-search-icon',
  Loader2: 'gui-loader-icon',
  Command: 'gui-command-icon',
}))

vi.mock(
  '@/components/search/search-results/search-result.tsx',
  () => ({
    SearchResult: 'gui-search-result',
  }),
)

vi.mock('@/components/ui/input-group.tsx', () => ({
  InputGroup: 'gui-input-group',
  InputGroupInput: 'gui-input-group-input',
  InputGroupAddon: 'gui-input-group-addon',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/kbd', () => ({
  Kbd: 'gui-kbd',
}))

vi.mock('@/components/search/search-results/sort.tsx', () => ({
  SearchResultsSort: 'gui-search-results-sort',
}))

vi.mock('@/components/search/search-results/page-navigation', () => ({
  SearchResultsPaginationNavigation:
    'gui-search-results-pagination-navigation',
}))

vi.mock('@/components/ui/jelly-spinner', () => ({
  JellyTriangleSpinner: 'gui-jelly-triangle-spinner',
}))

vi.mock('@/components/ui/empty-state', () => ({
  Empty: 'gui-empty',
  EmptyMedia: 'gui-empty-media',
  EmptyTitle: 'gui-empty-title',
  EmptyHeader: 'gui-empty-header',
  EmptyDescription: 'gui-empty-description',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeEach(() => {
  const defaultState = {
    total: 0,
    query: 'react',
    isLoading: false,
    searchTerm: 'react',
    setSearchTerm: vi.fn(),
    executeSearch: vi.fn(),
    results: [],
    error: null,
    page: 1,
    sortDir: 'desc',
    sortBy: 'relevance',
    reset: vi.fn(),
  }

  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(defaultState),
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('renders search results view', () => {
  const { container } = render(<SearchResults />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders search results with results', () => {
  const mockResults = [
    {
      package: {
        name: 'react',
        version: '18.0.0',
        description: 'React library',
        date: '2024-01-01T00:00:00.000Z',
        links: {
          repository: 'https://github.com/facebook/react',
          npm: 'https://www.npmjs.com/package/react',
        },
        maintainers: [],
      },
    },
    {
      package: {
        name: 'react-dom',
        version: '18.0.0',
        description: 'React DOM',
        date: '2024-01-01T00:00:00.000Z',
        links: {
          repository: 'https://github.com/facebook/react',
          npm: 'https://www.npmjs.com/package/react-dom',
        },
        maintainers: [],
      },
    },
  ]

  const mockState = {
    total: 2,
    query: 'react',
    isLoading: false,
    searchTerm: 'react',
    setSearchTerm: vi.fn(),
    executeSearch: vi.fn(),
    results: mockResults,
    error: null,
    page: 1,
    sortDir: 'desc',
    sortBy: 'relevance',
    reset: vi.fn(),
  }

  // Completely replace the mock implementation
  mockUseSearchResultsStore.mockClear()
  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<SearchResults />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders search results with no results', () => {
  mockUseSearchResultsStore.mockImplementation(selector =>
    selector({
      total: 0,
      query: 'nonexistentpackage',
      isLoading: false,
      searchTerm: 'nonexistentpackage',
      setSearchTerm: vi.fn(),
      executeSearch: vi.fn(),
      results: [],
      error: null,
      page: 1,
      sortDir: 'desc',
      sortBy: 'relevance',
      reset: vi.fn(),
    }),
  )

  const { container } = render(<SearchResults />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders search results with error', () => {
  mockUseSearchResultsStore.mockImplementation(selector =>
    selector({
      total: 0,
      query: 'react',
      isLoading: false,
      searchTerm: 'react',
      setSearchTerm: vi.fn(),
      executeSearch: vi.fn(),
      results: [],
      error: 'Failed to fetch results',
      page: 1,
      sortDir: 'desc',
      sortBy: 'relevance',
      reset: vi.fn(),
    }),
  )

  const { container } = render(<SearchResults />)
  expect(container.innerHTML).toMatchSnapshot()
})
