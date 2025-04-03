import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import {
  OverviewTabButton,
  OverviewTabContent,
} from '@/components/explorer-grid/selected-item/tabs-overview.jsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
} from './__fixtures__/item.ts'
import type { GridItemData } from '@/components/explorer-grid/types.js'
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

vi.mock('react-markdown', () => ({
  default: 'gui-markdown',
}))

vi.mock('lucide-react', () => ({
  FileText: 'gui-file-text-icon',
  RectangleHorizontal: 'gui-rectangle-horizontal-icon',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    selectedItemDetails: SELECTED_ITEM_DETAILS,
    insights: undefined,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
  })
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('OverviewTabButton renders default', () => {
  const Container = () => {
    return <OverviewTabButton />
  }

  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})

test('OverviewTabContent renders default', () => {
  const Container = () => {
    return <OverviewTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('OverviewTabContent renders with content', () => {
  const ITEM_WITH_DESCRIPTION = {
    ...SELECTED_ITEM,
    to: {
      name: 'item',
      version: '1.0.0',
      id: ['registry', 'custom', 'item@1.0.0'],
      manifest: {
        description: '## Description\n\nThis is a custom description',
      },
    },
  } as unknown as GridItemData

  const ITEM_DETAILS_WITH_AUTHOR = {
    ...SELECTED_ITEM_DETAILS,
    author: {
      name: 'John Doe',
      mail: 'johndoe@acme.com',
      email: 'johndoe@acme.com',
      url: 'https://acme.com/johndoe',
      web: 'https://acme.com/johndoe',
    },
  } as unknown as DetailsInfo

  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: ITEM_WITH_DESCRIPTION,
    selectedItemDetails: ITEM_DETAILS_WITH_AUTHOR,
    insights: undefined,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
  })

  const Container = () => {
    return <OverviewTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
