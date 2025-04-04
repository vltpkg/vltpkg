import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Insights } from '@/components/explorer-grid/selected-item/insights.jsx'
import { useGraphStore as useStore } from '@/state/index.js'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
} from './__fixtures__/item.ts'
import type { SocketSecurityDetails } from '@/lib/constants/socket.js'

vi.mock(
  '@/components/explorer-grid/selected-item/context.jsx',
  () => ({
    useSelectedItem: vi.fn(),
  }),
)

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
    activeTab: 'insight',
    setActiveTab: vi.fn(),
  })
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('Insights renders default', () => {
  const Container = () => {
    return <Insights />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toBe('')
})

test('Insights renders with socket insights', () => {
  const mockInsights: SocketSecurityDetails[] = [
    {
      selector: ':mock-selector',
      description: 'Mock description',
      category: 'Supply Chain',
      severity: 'medium',
    },
  ]

  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    selectedItemDetails: SELECTED_ITEM_DETAILS,
    insights: mockInsights,
    activeTab: 'insight',
    setActiveTab: vi.fn(),
  })

  const { container } = render(<Insights />)
  expect(container.innerHTML).toMatchSnapshot()
})
