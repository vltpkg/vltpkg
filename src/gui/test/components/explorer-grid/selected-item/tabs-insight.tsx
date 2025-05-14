import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import type { SelectedItemStore } from '@/components/explorer-grid/selected-item/context.jsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.jsx'
import {
  InsightTabButton,
  InsightTabContent,
} from '@/components/explorer-grid/selected-item/tabs-insight.jsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
} from './__fixtures__/item.js'
import type { SocketSecurityDetails } from '@/lib/constants/socket.js'
import type { PackageScore } from '@vltpkg/security-archive'

const MOCK_INSIGHTS: SocketSecurityDetails[] = [
  {
    selector: ':mock-selector',
    description: 'Packages that are missing an author field',
    category: 'Supply Chain',
    severity: 'medium',
  },
]

const MOCK_PACKAGE_SCORE: PackageScore = {
  overall: 90,
  maintenance: 85,
  vulnerability: 2,
  license: 100,
  quality: 90,
  supplyChain: 4,
}

vi.mock(
  '@/components/explorer-grid/selected-item/context.jsx',
  () => ({
    useSelectedItemStore: vi.fn(),
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
  BadgeInfo: 'gui-badge-info-icon',
  BadgeCheck: 'gui-badge-check-icon',
}))

vi.mock('@/components/ui/progress-circle.jsx', () => ({
  ProgressCircle: 'gui-progress-circle',
}))

vi.mock('@/components/ui/link.jsx', () => ({
  Link: 'gui-link',
}))

vi.mock('@/components/ui/data-badge.jsx', () => ({
  DataBadge: 'gui-data-badge',
}))

vi.mock('recharts', () => ({
  Label: 'gui-recharts-label',
  PolarGrid: 'gui-recharts-polar-grid',
  PolarRadiusAxis: 'gui-recharts-polar-radius-axis',
  RadialBar: 'gui-recharts-radial-bar',
  RadialBarChart: 'gui-recharts-radial-bar-chart',
}))

vi.mock('@/components/ui/chart.jsx', () => ({
  ChartContainer: 'gui-chart-container',
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

test('InsightTabContent renders an empty state', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    insights: undefined,
    manifest: null,
    rawManifest: null,
    activeTab: 'insights' as const,
    setActiveTab: vi.fn(),
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <InsightTabContent />
  }
  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})

test('InsightTabContent renders with insights', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    insights: MOCK_INSIGHTS,
    manifest: null,
    rawManifest: null,
    activeTab: 'insights' as const,
    setActiveTab: vi.fn(),
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <InsightTabContent />
  }
  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})

test('InsightTabContent renders with no insights but a package score', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    manifest: null,
    rawManifest: null,
    insights: undefined,
    activeTab: 'insights' as const,
    packageScore: MOCK_PACKAGE_SCORE,
    setActiveTab: vi.fn(),
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <InsightTabContent />
  }
  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})

test('InsightTabButton renders default', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    insights: undefined,
    manifest: null,
    rawManifest: null,
    activeTab: 'insights' as const,
    setActiveTab: vi.fn(),
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <InsightTabButton />
  }
  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})
