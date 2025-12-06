import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { CodeTabContent } from '@/components/explorer-grid/selected-item/tabs-code/index.tsx'

vi.mock('lucide-react', () => ({
  ArrowLeft: 'gui-arrow-left',
  DecimalsArrowRight: 'gui-decimals-arrow-right',
  FileCode2: 'gui-file-code-2-icon',
  FileWarning: 'gui-file-warning-icon',
  Files: 'gui-files-icon',
  FileSliders: 'gui-file-sliders',
  Search: 'gui-search-icon',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/input.tsx', () => ({
  Input: 'gui-input',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/empty-state.tsx',
  () => ({
    SelectedItemEmptyState: 'gui-selected-item-empty-state',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-code/package-content-item.tsx',
  () => ({
    PackageContentItem: 'gui-package-content-item',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-code/view-switcher.tsx',
  () => ({
    ViewSwitcher: 'gui-view-switcher',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-code/loading-state.tsx',
  () => ({
    LoadingState: 'gui-loading-state',
  }),
)

vi.mock('@/components/ui/code-block.tsx', () => ({
  CodeBlock: 'gui-code-block',
}))

vi.mock('@/components/markdown-components.tsx', () => ({
  Markdown: 'gui-markdown',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-code/sorting-header.tsx',
  () => ({
    SortingHeader: 'gui-sorting-header',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  () => ({
    useSelectedItemStore: (selector: (s: any) => any) =>
      selector({
        selectedItem: { name: 'selected-pkg', to: { id: 'dep' } },
      }),
  }),
)

const useCodeExplorerMock = vi.fn()
vi.mock(
  '@/components/explorer-grid/selected-item/tabs-code/hooks/use-code-explorer.tsx',
  () => ({
    useCodeExplorer: (...args: unknown[]) =>
      useCodeExplorerMock(...args),
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-code/hooks/use-code-navigation.tsx',
  () => ({
    useCodeNavigation: () => ({
      onRootNavigate: vi.fn(),
      onCrumbNavigate: vi.fn(),
      onItemNavigate: vi.fn(),
      selectedLines: null,
      setSelectedLines: vi.fn(),
    }),
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

test('CodeTabContent renders loading state', () => {
  useCodeExplorerMock.mockReturnValue({
    packageContents: undefined,
    loading: true,
    selectedPackageContentItem: null,
    breadcrumbs: [],
    onPackageContentItemClick: vi.fn(),
    onRootClick: vi.fn(),
    onCrumbClick: vi.fn(),
    errors: null,
  })
  render(<CodeTabContent />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('CodeTabContent renders empty state', () => {
  useCodeExplorerMock.mockReturnValue({
    packageContents: [],
    loading: false,
    selectedPackageContentItem: null,
    breadcrumbs: [],
    onPackageContentItemClick: vi.fn(),
    onRootClick: vi.fn(),
    onCrumbClick: vi.fn(),
    errors: null,
  })
  render(<CodeTabContent />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('CodeTabContent renders error state', () => {
  useCodeExplorerMock.mockReturnValue({
    packageContents: [],
    loading: false,
    selectedPackageContentItem: null,
    breadcrumbs: [],
    onPackageContentItemClick: vi.fn(),
    onRootClick: vi.fn(),
    onCrumbClick: vi.fn(),
    errors: [{ origin: 'x', cause: 'y' }],
  })
  render(<CodeTabContent />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('CodeTabContent renders directory listing', () => {
  useCodeExplorerMock.mockReturnValue({
    packageContents: [
      {
        name: 'a',
        path: '/a',
        type: 'directory',
        size: 0,
        mtime: '0',
      },
      { name: 'b', path: '/b', type: 'file', size: 1, mtime: '0' },
    ],
    loading: false,
    selectedPackageContentItem: null,
    breadcrumbs: [{ name: 'root', path: '/root' }],
    onPackageContentItemClick: vi.fn(),
    onRootClick: vi.fn(),
    onCrumbClick: vi.fn(),
    errors: null,
  })
  render(<CodeTabContent />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('CodeTabContent renders code view for selected file', () => {
  useCodeExplorerMock.mockReturnValue({
    packageContents: [],
    loading: false,
    selectedPackageContentItem: {
      name: 'file.ts',
      content: 'const x = 1',
      encoding: 'utf8',
      mime: 'application/typescript',
      ext: 'ts',
    },
    breadcrumbs: [{ name: 'root', path: '/root' }],
    onPackageContentItemClick: vi.fn(),
    onRootClick: vi.fn(),
    onCrumbClick: vi.fn(),
    errors: null,
  })
  render(<CodeTabContent />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
