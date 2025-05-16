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
  '@/components/explorer-grid/selected-item/tabs-manifest.tsx',
  () => ({
    TabsManifestButton: 'gui-manifest-tab-button',
    TabsManifestContent: 'gui-manifest-tab-content',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/item-header.tsx',
  () => ({
    ItemHeader: 'gui-item-header',
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
    activeTab: 'insights',
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
    activeTab: 'insights',
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
  } satisfies SelectedItemStore)

  const Container = () => {
    return <Item item={SELECTED_ITEM_WITH_EDGES} />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
