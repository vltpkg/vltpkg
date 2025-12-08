import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { InsightTabContent } from '@/components/explorer-grid/selected-item/tabs-insight.tsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
  MOCK_LOADING_STATE,
} from './__fixtures__/item.ts'

import type { PackageScore } from '@vltpkg/security-archive'
import type { SelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import type { SocketSecurityDetails } from '@/lib/constants/selectors.ts'

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
  '@/components/explorer-grid/selected-item/context.tsx',
  () => ({
    useSelectedItemStore: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
    useTabNavigation: {
      tab: 'insights',
      subTab: undefined,
      setActiveTab: vi.fn(),
      setActiveSubTab: vi.fn(),
    },
  }),
)

vi.mock('react-router', () => ({
  Link: 'gui-link',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/empty-state.tsx',
  () => ({
    SelectedItemEmptyState: 'gui-selected-item-empty-state',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/insight-badge.tsx',
  () => ({
    InsightBadge: 'gui-insight-badge',
  }),
)

vi.mock('lucide-react', () => ({
  ArrowUpDown: 'gui-arrow-up-down-icon',
  BadgeInfo: 'gui-badge-info-icon',
  BadgeCheck: 'gui-badge-check-icon',
}))

vi.mock('@/components/ui/link.tsx', () => ({
  Link: 'gui-link',
}))

vi.mock('@/components/ui/data-badge.tsx', () => ({
  DataBadge: 'gui-data-badge',
}))

vi.mock('recharts', () => ({
  Label: 'gui-recharts-label',
  PolarGrid: 'gui-recharts-polar-grid',
  PolarRadiusAxis: 'gui-recharts-polar-radius-axis',
  RadialBar: 'gui-recharts-radial-bar',
  RadialBarChart: 'gui-recharts-radial-bar-chart',
}))

vi.mock('@/components/ui/chart.tsx', () => ({
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
    packageScore: MOCK_PACKAGE_SCORE,
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
