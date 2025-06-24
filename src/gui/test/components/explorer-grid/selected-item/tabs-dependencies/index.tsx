import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { SELECTED_ITEM } from '../__fixtures__/item.ts'
import {
  DependenciesTabsButton,
  DependenciesTabContent,
} from '@/components/explorer-grid/selected-item/tabs-dependencies/index.tsx'

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  () => ({
    useSelectedItemStore: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
  }),
)

vi.mock('@/components/ui/tabs.tsx', () => ({
  Tabs: 'gui-tabs',
  TabsList: 'gui-tabs-list',
  TabsTrigger: 'gui-tabs-trigger',
  TabsContent: 'gui-tabs-content',
}))

vi.mock('lucide-react', () => ({
  Blocks: 'gui-blocks-icon',
}))

vi.mock('@/components/ui/data-badge.tsx', () => ({
  DataBadge: 'gui-data-badge',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/empty-state.tsx',
  () => ({
    EmptyState: 'gui-empty-state',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-insights.tsx',
  () => ({
    InsightsTabContent: 'gui-insights-tab-content',
    InsightsTabButton: 'gui-insights-tab-button',
  }),
)
vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-licenses.tsx',
  () => ({
    LicensesTabContent: 'gui-licenses-tab-content',
    LicensesTabButton: 'gui-licenses-tab-button',
  }),
)
vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-funding.tsx',
  () => ({
    FundingTabContent: 'gui-funding-tab-content',
    FundingTabButton: 'gui-funding-tab-button',
  }),
)
vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-duplicates.tsx',
  () => ({
    DuplicatesTabContent: 'gui-duplicates-tab-content',
    DuplicatesTabButton: 'gui-duplicates-tab-button',
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

test('DependenciesTabsButton renders correctly', () => {
  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector({
      selectedItem: SELECTED_ITEM,
      activeTab: 'dependencies',
      setActiveTab: vi.fn(),
      manifest: null,
      rawManifest: null,
      packageScore: undefined,
      insights: undefined,
      author: undefined,
      favicon: undefined,
      publisher: undefined,
      publisherAvatar: undefined,
      versions: undefined,
      greaterVersions: undefined,
      depCount: 2,
      setDepCount: vi.fn(),
      scannedDeps: undefined,
      setScannedDeps: vi.fn(),
      depsAverageScore: undefined,
      setDepsAverageScore: vi.fn(),
      depLicenses: undefined,
      setDepLicenses: vi.fn(),
      depWarnings: undefined,
      setDepWarnings: vi.fn(),
      duplicatedDeps: undefined,
      setDuplicatedDeps: vi.fn(),
      depFunding: undefined,
      setDepFunding: vi.fn(),
    }),
  )

  const Container = () => {
    return <DependenciesTabsButton />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('DependenciesTabContent renders default', () => {
  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector({
      selectedItem: SELECTED_ITEM,
      activeTab: 'dependencies',
      setActiveTab: vi.fn(),
      manifest: null,
      rawManifest: null,
      packageScore: undefined,
      insights: undefined,
      author: undefined,
      favicon: undefined,
      publisher: undefined,
      publisherAvatar: undefined,
      versions: undefined,
      greaterVersions: undefined,
      depCount: 2,
      setDepCount: vi.fn(),
      scannedDeps: undefined,
      setScannedDeps: vi.fn(),
      depsAverageScore: undefined,
      setDepsAverageScore: vi.fn(),
      depLicenses: undefined,
      setDepLicenses: vi.fn(),
      depWarnings: undefined,
      setDepWarnings: vi.fn(),
      duplicatedDeps: undefined,
      setDuplicatedDeps: vi.fn(),
      depFunding: undefined,
      setDepFunding: vi.fn(),
    }),
  )

  const Container = () => {
    return <DependenciesTabContent />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('DependenciesTabContent renders an empty state', () => {
  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector({
      selectedItem: SELECTED_ITEM,
      activeTab: 'dependencies',
      setActiveTab: vi.fn(),
      manifest: null,
      rawManifest: null,
      packageScore: undefined,
      insights: undefined,
      author: undefined,
      favicon: undefined,
      publisher: undefined,
      publisherAvatar: undefined,
      versions: undefined,
      greaterVersions: undefined,
      depCount: 2,
      setDepCount: vi.fn(),
      scannedDeps: undefined,
      setScannedDeps: vi.fn(),
      depsAverageScore: undefined,
      setDepsAverageScore: vi.fn(),
      depLicenses: undefined,
      setDepLicenses: vi.fn(),
      depWarnings: undefined,
      setDepWarnings: vi.fn(),
      duplicatedDeps: undefined,
      setDuplicatedDeps: vi.fn(),
      depFunding: undefined,
      setDepFunding: vi.fn(),
    }),
  )

  const Container = () => {
    return <DependenciesTabContent />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
