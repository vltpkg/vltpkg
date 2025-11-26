import { vi, test, expect, afterEach, beforeEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Search } from '@/components/search/search.tsx'

const mockUseSearchStore = vi.fn()

vi.mock('react-router', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}))

vi.mock('@/state/search.ts', () => ({
  useSearchStore: (selector: (state: unknown) => unknown) =>
    mockUseSearchStore(selector),
}))

vi.mock('@/components/hooks/use-keydown.tsx', () => ({
  useKeyDown: vi.fn(),
}))

vi.mock('@/components/hooks/use-debounce.tsx', () => ({
  useDebounce: vi.fn((value: string) => value),
}))

vi.mock('@/utils/get-package-icon.ts', () => ({
  getPackageIcon: vi.fn(() => 'gui-package-icon'),
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  Search: 'gui-search-icon',
  Command: 'gui-command-icon',
  Loader2: 'gui-loader-icon',
  X: 'gui-x-icon',
  FileQuestion: 'gui-file-question-icon',
  PackageSearch: 'gui-package-search-icon',
}))

vi.mock('@/components/ui/command.tsx', () => ({
  CommandDialog: 'gui-command-dialog',
  CommandInput: 'gui-command-input',
  CommandEmpty: 'gui-command-empty',
  CommandItem: 'gui-command-item',
  CommandList: 'gui-command-list',
  CommandGroup: 'gui-command-group',
}))

vi.mock('@/components/ui/empty-state.tsx', () => ({
  Empty: 'gui-empty',
  EmptyHeader: 'gui-empty-header',
  EmptyMedia: 'gui-empty-media',
  EmptyTitle: 'gui-empty-title',
  EmptyDescription: 'gui-empty-description',
  EmptyContent: 'gui-empty-content',
}))

vi.mock('@/components/ui/kbd.tsx', () => ({
  Kbd: 'gui-kbd',
}))

vi.mock('@/components/ui/skeleton.tsx', () => ({
  Skeleton: 'gui-skeleton',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeEach(() => {
  mockUseSearchStore.mockImplementation(selector =>
    selector({
      searchTerm: '',
      setSearchTerm: vi.fn(),
      performSearch: vi.fn(),
      searchResults: [],
      isLoading: false,
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('search palette renders default', () => {
  const { container } = render(<Search />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('search palette renders with results', () => {
  const searchResults = [
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

  mockUseSearchStore.mockImplementation(selector =>
    selector({
      searchTerm: 'react',
      setSearchTerm: vi.fn(),
      performSearch: vi.fn(),
      searchResults,
      isLoading: false,
    }),
  )

  const { container } = render(<Search />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('search palette renders with empty state', () => {
  mockUseSearchStore.mockImplementation(selector =>
    selector({
      searchTerm: 'nonexistentpackage',
      setSearchTerm: vi.fn(),
      performSearch: vi.fn(),
      searchResults: [],
      isLoading: false,
    }),
  )

  const { container } = render(<Search />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('search palette renders a loading state', () => {
  mockUseSearchStore.mockImplementation(selector =>
    selector({
      searchTerm: 'loading',
      setSearchTerm: vi.fn(),
      performSearch: vi.fn(),
      searchResults: [],
      isLoading: true,
    }),
  )

  const { container } = render(<Search />)
  expect(container.innerHTML).toMatchSnapshot()
})
