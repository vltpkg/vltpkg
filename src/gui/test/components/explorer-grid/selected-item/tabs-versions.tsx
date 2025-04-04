import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import {
  VersionsTabButton,
  VersionsTabContent,
} from '@/components/explorer-grid/selected-item/tabs-versions.jsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
} from './__fixtures__/item.ts'
import type { DetailsInfo } from '@/lib/external-info.js'

vi.mock(
  '@/components/explorer-grid/selected-item/context.jsx',
  () => ({
    useSelectedItem: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
  }),
)

vi.mock('@/components/ui/tabs.jsx', () => ({
  TabsTrigger: 'gui-tabs-trigger',
  TabsContent: 'gui-tabs-content',
}))

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

test('VersionsTabButton renders default', () => {
  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    selectedItemDetails: {
      ...SELECTED_ITEM_DETAILS,
      versions: ['1.0.0', '1.0.1', '1.0.2'],
    } as DetailsInfo,
    insights: undefined,
    activeTab: 'versions',
    setActiveTab: vi.fn(),
  })

  const { container } = render(<VersionsTabButton />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('VersionsTabButton does not render when any verions are not available', () => {
  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    selectedItemDetails: {
      ...SELECTED_ITEM_DETAILS,
      greaterVersions: undefined,
      versions: undefined,
    } as DetailsInfo,
    insights: undefined,
    activeTab: 'versions',
    setActiveTab: vi.fn(),
  })

  const { container } = render(<VersionsTabButton />)
  expect(container.innerHTML).toBe('')
})

test('VersionsTabContent renders default', () => {
  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    selectedItemDetails: {
      ...SELECTED_ITEM_DETAILS,
      versions: ['1.0.0', '1.0.1', '1.0.2'],
    } as DetailsInfo,
    insights: undefined,
    activeTab: 'versions',
    setActiveTab: vi.fn(),
  })

  const { container } = render(<VersionsTabContent />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('VersionsTabContent does not render when any versions are not available', () => {
  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    selectedItemDetails: {
      ...SELECTED_ITEM_DETAILS,
      greaterVersions: undefined,
      versions: undefined,
    } as DetailsInfo,
    insights: undefined,
    activeTab: 'versions',
    setActiveTab: vi.fn(),
  })

  const { container } = render(<VersionsTabContent />)
  expect(container.innerHTML).toBe('')
})
