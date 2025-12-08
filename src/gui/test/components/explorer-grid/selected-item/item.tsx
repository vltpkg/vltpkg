import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { Item } from '@/components/explorer-grid/selected-item/item.tsx'
import type { SelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import {
  SELECTED_ITEM,
  MOCK_LOADING_STATE,
} from './__fixtures__/item.ts'

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('react-router', () => ({
  Outlet: 'gui-router-outlet',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  async () => {
    const actual = await import(
      '@/components/explorer-grid/selected-item/context.tsx'
    )
    return {
      ...actual,
      useSelectedItemStore: vi.fn(),
      SelectedItemProvider: 'gui-selected-item-provider',
      useTabNavigation: vi.fn(() => ({
        tab: 'overview',
        subTab: undefined,
        setActiveTab: vi.fn(),
        setActiveSubTab: vi.fn(),
      })),
    }
  },
)

vi.mock('lucide-react', () => ({
  ChevronRight: 'gui-chevron-right-icon',
  ChevronLeft: 'gui-chevron-left-icon',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/navigation.tsx',
  () => ({
    Navigation: 'gui-navigation',
    NavigationButton: 'gui-navigation-button',
    NavigationList: 'gui-navigation-list',
    NavigationListItem: 'gui-navigation-list-item',
  }),
)

vi.mock('@/components/ui/jelly-spinner.tsx', () => ({
  JellyTriangleSpinner: 'gui-jelly-triangle-spinner',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/partial-errors-indicator.tsx',
  () => ({
    PartialErrorsIndicator: 'gui-partial-errors-indicator',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-insight.tsx',
  () => ({
    InsightTabContent: 'gui-insight-tab-content',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-overview.tsx',
  () => ({
    OverviewTabContent: 'gui-overview-tab-content',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-versions.tsx',
  () => ({
    VersionsTabContent: 'gui-versions-tab-content',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-json.tsx',
  () => ({
    TabsManifestContent: 'gui-manifest-tab-content',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/item-header.tsx',
  () => ({
    PackageImageSpec: 'gui-package-image-spec',
    ItemBreadcrumbs: 'gui-item-breadcrumbs',
    Publisher: 'gui-publisher',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/index.tsx',
  () => ({
    DependenciesTabContent: 'gui-dependencies-tab-content',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-code/index.tsx',
  () => ({
    CodeTabContent: 'gui-tabs-code-content',
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

test('Item renders with the default structure', () => {
  vi.mocked(useSelectedItemStore).mockReturnValue({
    selectedItem: SELECTED_ITEM,
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
    depCount: undefined,
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
    ...MOCK_LOADING_STATE,
  } satisfies SelectedItemStore)

  const Container = () => {
    return <Item item={SELECTED_ITEM} />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
