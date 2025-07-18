import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { Item } from '@/components/explorer-grid/selected-item/item.tsx'
import type { SelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_WITH_EDGES,
} from './__fixtures__/item.ts'

vi.mock('react-router', () => ({
  Outlet: 'gui-router-outlet',
}))

vi.mock('@/components/ui/card.tsx', () => ({
  Card: 'gui-card',
}))

vi.mock('@/components/ui/tabs.tsx', () => ({
  Tabs: 'gui-tabs',
  TabsList: 'gui-tabs-list',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  () => ({
    useSelectedItemStore: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
    useTabNavigation: vi.fn(() => ({
      tab: 'overview',
      subTab: undefined,
      setActiveTab: vi.fn(),
      setActiveSubTab: vi.fn(),
    })),
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-insight.tsx',
  () => ({
    InsightTabButton: 'gui-insight-tab-button',
    InsightTabContent: 'gui-insight-tab-content',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-overview.tsx',
  () => ({
    OverviewTabButton: 'gui-overview-tab-button',
    OverviewTabContent: 'gui-overview-tab-content',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-versions.tsx',
  () => ({
    VersionsTabButton: 'gui-versions-tab-button',
    VersionsTabContent: 'gui-versions-tab-content',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-json.tsx',
  () => ({
    TabsJsonButton: 'gui-json-tab-button',
    TabsManifestContent: 'gui-manifest-tab-content',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/item-header.tsx',
  () => ({
    ItemHeader: 'gui-item-header',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/index.tsx',
  () => ({
    DependenciesTabsButton: 'gui-dependencies-tabs-button',
    DependenciesTabContent: 'gui-dependencies-tab-content',
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
  } satisfies SelectedItemStore)

  const Container = () => {
    return <Item item={SELECTED_ITEM} />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('Item renders connection lines', () => {
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
  } satisfies SelectedItemStore)

  const Container = () => {
    return <Item item={SELECTED_ITEM_WITH_EDGES} />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
