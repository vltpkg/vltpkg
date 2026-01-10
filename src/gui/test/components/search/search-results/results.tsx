import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { SearchResults } from '@/components/search/search-results/results.tsx'

import type { SearchObject } from '@/lib/package-search'

vi.mock('nuqs', () => ({
  useQueryState: vi.fn((key: string) => {
    if (key === 'q') return ['react', vi.fn()]
    if (key === 'page') return [1, vi.fn()]
    if (key === 'pageSize') return [25, vi.fn()]
    if (key === 'sortBy') return ['', vi.fn()]
    if (key === 'sortDir') return ['asc', vi.fn()]
    return [null, vi.fn()]
  }),
  parseAsString: {
    withDefault: vi.fn(() => ({})),
  },
  parseAsInteger: {
    withDefault: vi.fn(() => ({})),
  },
}))

vi.mock('lucide-react', () => ({
  CircleAlert: 'gui-circle-alert-icon',
  Sparkle: 'gui-sparkle-icon',
  Shield: 'gui-shield-icon',
  Wrench: 'gui-wrench-icon',
  Calendar: 'gui-calendar-icon',
  TrendingUp: 'gui-trending-up-icon',
  PackageSearch: 'gui-package-search-icon',
}))

vi.mock(
  '@/components/search/search-results/search-result.tsx',
  () => ({
    SearchResult: ({ item }: { item: SearchObject }) => (
      <div data-testid="search-result" data-name={item.package.name}>
        {item.package.name}@{item.package.version}
      </div>
    ),
  }),
)

vi.mock('@/components/ui/jelly-spinner.tsx', () => ({
  JellyTriangleSpinner: 'gui-jelly-triangle-spinner',
}))

vi.mock('@/components/ui/empty-state.tsx', () => ({
  Empty: 'gui-empty',
  EmptyMedia: 'gui-empty-media',
  EmptyTitle: 'gui-empty-title',
  EmptyHeader: 'gui-empty-header',
  EmptyDescription: 'gui-empty-description',
}))

vi.mock('@/components/ui/cross.tsx', () => ({
  Cross: 'gui-cross',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/table/index.tsx', () => ({
  Table: 'gui-table',
  TableBody: 'gui-table-body',
  TableCaption: 'gui-table-caption',
  TableFooter: 'gui-table-footer',
  TableRow: 'gui-table-row',
  TablePaginationList: 'gui-table-pagination-list',
  TablePaginationListItem: 'gui-table-pagination-list-item',
  TablePaginationListButton: 'gui-table-pagination-list-button',
  TableFilterList: 'gui-table-filter-list',
  TableFilterListItem: 'gui-table-filter-list-item',
  TableFilterListButton: 'gui-table-filter-list-button',
}))

vi.mock('@/components/hooks/use-debounce.tsx', () => ({
  useDebounce: vi.fn((value: string) => value),
}))

const mockUseSearchResultsStore = vi.fn()

vi.mock('@/state/search-results.ts', () => ({
  useSearchResultsStore: (selector: (state: unknown) => unknown) =>
    mockUseSearchResultsStore(selector),
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('renders search results with loading state', () => {
  const mockState = {
    results: [],
    total: 0,
    isLoading: false,
    error: null,
    query: '',
    fetchResults: vi.fn(),
    setQuery: vi.fn(),
    reset: vi.fn(),
  }

  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<SearchResults />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders search results with results', () => {
  const mockResults: SearchObject[] = [
    {
      package: {
        name: 'react',
        version: '18.2.0',
        description:
          'React is a JavaScript library for building user interfaces.',
        keywords: ['react', 'ui', 'library'],
        date: '2024-01-01T00:00:00.000Z',
        links: {
          npm: 'https://www.npmjs.com/package/react',
          homepage: 'https://react.dev',
          repository: 'https://github.com/facebook/react',
        },
        maintainers: [
          {
            username: 'reactjs',
            email: 'react@example.com',
          },
        ],
      },
      downloads: {
        monthly: 50000000,
        weekly: 12000000,
      },
      score: {
        final: 0.95,
        detail: {
          quality: 0.98,
          popularity: 0.99,
          maintenance: 0.88,
        },
      },
      searchScore: 100000,
    },
    {
      package: {
        name: 'react-dom',
        version: '18.2.0',
        description: 'React package for working with the DOM.',
        keywords: ['react', 'dom'],
        date: '2024-01-01T00:00:00.000Z',
        links: {
          npm: 'https://www.npmjs.com/package/react-dom',
          repository: 'https://github.com/facebook/react',
        },
        maintainers: [
          {
            username: 'reactjs',
            email: 'react@example.com',
          },
        ],
      },
      downloads: {
        monthly: 48000000,
        weekly: 11000000,
      },
      score: {
        final: 0.94,
        detail: {
          quality: 0.97,
          popularity: 0.98,
          maintenance: 0.87,
        },
      },
      searchScore: 95000,
    },
  ]

  const mockState = {
    results: mockResults,
    total: 2,
    isLoading: false,
    error: null,
    query: 'react',
    fetchResults: vi.fn(),
    setQuery: vi.fn(),
    reset: vi.fn(),
  }

  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<SearchResults />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders search results with no results', () => {
  const mockState = {
    results: [],
    total: 0,
    isLoading: false,
    error: null,
    query: 'nonexistentpackage',
    fetchResults: vi.fn(),
    setQuery: vi.fn(),
    reset: vi.fn(),
  }

  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<SearchResults />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('renders search results with many results triggering pagination', () => {
  const mockResults: SearchObject[] = Array.from(
    { length: 50 },
    (_, i) => ({
      package: {
        name: `package-${i}`,
        version: '1.0.0',
        description: `Package ${i} description`,
        date: '2024-01-01T00:00:00.000Z',
        links: {
          npm: `https://www.npmjs.com/package/package-${i}`,
        },
        maintainers: [
          {
            username: 'maintainer',
            email: 'maintainer@example.com',
          },
        ],
      },
      downloads: {
        monthly: 10000,
        weekly: 2500,
      },
      score: {
        final: 0.75,
        detail: {
          quality: 0.8,
          popularity: 0.7,
          maintenance: 0.75,
        },
      },
      searchScore: 1000,
    }),
  )

  const mockState = {
    results: mockResults,
    total: 50,
    isLoading: false,
    error: null,
    query: 'package',
    fetchResults: vi.fn(),
    setQuery: vi.fn(),
    reset: vi.fn(),
  }

  mockUseSearchResultsStore.mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<SearchResults />)
  expect(container.innerHTML).toMatchSnapshot()
})
