import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import { getSecurityAlerts } from '@/components/explorer-grid/selected-item/insights.jsx'
import {
  InsightTabButton,
  InsightTabContent,
} from '@/components/explorer-grid/selected-item/tabs-insight.jsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
} from './__fixtures__/item.ts'
import type { SocketSecurityDetails } from '@/lib/constants/socket.js'

vi.mock(
  '@/components/explorer-grid/selected-item/context.jsx',
  () => ({
    useSelectedItem: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/insights.jsx',
  () => ({
    getSecurityAlerts: vi.fn(),
  }),
)

vi.mock('react-router', () => ({
  Link: 'gui-link',
}))

vi.mock('@/components/ui/tabs.jsx', () => ({
  TabsTrigger: 'gui-tabs-trigger',
  TabsContent: 'gui-tabs-content',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/insight-badge.jsx',
  async () => {
    const actual = await import(
      '@/components/explorer-grid/selected-item/insight-badge.jsx'
    )
    return {
      ...actual,
      InsightBadge: 'gui-insight-badge',
    }
  },
)

vi.mock('lucide-react', () => ({
  ArrowUpDown: 'gui-arrow-up-down-icon',
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
    securityArchive: undefined,
    activeTab: 'insight',
    setActiveTab: vi.fn(),
  })
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('InsightTabContent renders default', () => {
  const Container = () => {
    return <InsightTabContent />
  }
  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})

test('InsightTabContent renders with insights', () => {
  vi.mocked(getSecurityAlerts).mockReturnValue([
    {
      selector: ':mock-selector',
      description: 'A mock selector',
      severity: 'middle',
      category: 'Supply Chain',
    } as SocketSecurityDetails,
  ])

  const Container = () => {
    return <InsightTabContent />
  }
  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})

test('InsightTabButton renders default', () => {
  const Container = () => {
    return <InsightTabButton />
  }
  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})
