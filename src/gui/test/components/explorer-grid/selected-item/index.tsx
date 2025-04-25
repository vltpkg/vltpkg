import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { SelectedItem } from '@/components/explorer-grid/selected-item/index.jsx'
import type { SelectedItemStore } from '@/components/explorer-grid/selected-item/context.jsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.jsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_WITH_EDGES,
} from './__fixtures__/item.ts'

vi.mock('@/components/ui/card.jsx', () => ({
  Card: 'gui-card',
}))

vi.mock('@/components/ui/tabs.jsx', () => ({
  Tabs: 'gui-tabs',
  TabsList: 'gui-tabs-list',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/context.jsx',
  () => ({
    useSelectedItemStore: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-insight.jsx',
  () => ({
    InsightTabButton: 'gui-insight-tab-button',
    InsightTabContent: 'gui-insight-tab-content',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-overview.jsx',
  () => ({
    OverviewTabButton: 'gui-overview-tab-button',
    OverviewTabContent: 'gui-overview-tab-content',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-versions.jsx',
  () => ({
    VersionsTabButton: 'gui-versions-tab-button',
    VersionsTabContent: 'gui-versions-tab-content',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-manifest.jsx',
  () => ({
    TabsManifestButton: 'gui-manifest-tab-button',
    TabsManifestContent: 'gui-manifest-tab-content',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/item-header.jsx',
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

test('SelectedItem renders with the default structure', () => {
  vi.mocked(useSelectedItemStore).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    activeTab: 'insights',
    setActiveTab: vi.fn(),
    manifest: null,
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
    return <SelectedItem item={SELECTED_ITEM} />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SelectedItem renders connection lines', () => {
  vi.mocked(useSelectedItemStore).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    activeTab: 'insights',
    setActiveTab: vi.fn(),
    manifest: null,
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
    return <SelectedItem item={SELECTED_ITEM_WITH_EDGES} />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
