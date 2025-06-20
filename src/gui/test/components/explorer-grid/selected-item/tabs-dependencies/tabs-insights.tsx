import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { SELECTED_ITEM } from '../__fixtures__/item.ts'
import {
  InsightsTabButton,
  InsightsTabContent,
} from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-insights.tsx'
import type { DepWarning } from '@/components/explorer-grid/selected-item/context.tsx'

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  () => ({
    useSelectedItemStore: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
  }),
)

vi.mock('@/components/ui/tabs.tsx', () => ({
  TabsTrigger: 'gui-tabs-trigger',
  TabsContent: 'gui-tabs-content',
}))

vi.mock('@/components/ui/table.tsx', () => ({
  Table: 'gui-table',
  TableBody: 'gui-table-body',
  TableCell: 'gui-table-cell',
  TableHead: 'gui-table-head',
  TableHeader: 'gui-table-header',
  TableRow: 'gui-table-row',
}))

vi.mock('lucide-react', () => ({
  AlertTriangle: 'gui-alert-triangle-icon',
  ShieldX: 'gui-shield-x-icon',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/empty-state.tsx',
  () => ({
    EmptyState: 'gui-empty-state',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/table-utilities.tsx',
  async () => {
    const actual = await import(
      '@/components/explorer-grid/selected-item/tabs-dependencies/table-utilities.tsx'
    )
    return {
      ...actual,
      SortingHeader: 'gui-sorting-header',
    }
  },
)

vi.mock(
  '@/components/explorer-grid/selected-item/insight-badge.tsx',
  async () => {
    const actual = await import(
      '@/components/explorer-grid/selected-item/insight-badge.tsx'
    )
    return {
      ...actual,
      InsightBadge: 'gui-insight-badge',
    }
  },
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/warning.tsx',
  () => ({
    Warning: 'gui-warning',
  }),
)

vi.mock('@/components/ui/data-badge.tsx', () => ({
  DataBadge: 'gui-data-badge',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

const mockDepWarnings = new Map<string, DepWarning>([
  [
    ':abandoned',
    {
      selector: ':abandoned',
      severity: 'medium',
      description: 'Packages that are missing an author field',
      category: 'Supply Chain',
      count: 3,
    },
  ],
  [
    ':confused',
    {
      selector: ':confused',
      severity: 'medium',
      description:
        'Packages affected by manifest confusion. This could be malicious or caused by an error when publishing the package',
      category: 'Supply Chain',
      count: 2,
    },
  ],
  [
    ':eval',
    {
      selector: ':eval',
      severity: 'medium',
      description:
        'Packages that use dynamic code execution (e.g., eval()), which is a dangerous practice. This can prevent the code from running in certain environments and increases the risk that the code may contain exploits or malicious behavior',
      category: 'Supply Chain',
      count: 1,
    },
  ],
])

test('InsightsTabButton renders default', () => {
  const Container = () => {
    return <InsightsTabButton />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('InsightsTabButton renders with insight count', () => {
  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector({
      selectedItem: SELECTED_ITEM,
      activeTab: 'dependencies',
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
      depCount: 3,
      setDepCount: vi.fn(),
      scannedDeps: 3,
      setScannedDeps: vi.fn(),
      depsAverageScore: undefined,
      setDepsAverageScore: vi.fn(),
      depLicenses: undefined,
      setDepLicenses: vi.fn(),
      depWarnings: Array.from(mockDepWarnings.values()),
      setDepWarnings: vi.fn(),
      duplicatedDeps: undefined,
      setDuplicatedDeps: vi.fn(),
    }),
  )

  const Container = () => {
    return <InsightsTabButton />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('InsightsTabContent renders with an empty state', () => {
  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector({
      selectedItem: SELECTED_ITEM,
      activeTab: 'dependencies',
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
    }),
  )

  const Container = () => {
    return <InsightsTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('InsightsTabContent renders with insights', () => {
  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector({
      selectedItem: SELECTED_ITEM,
      activeTab: 'dependencies',
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
      depCount: 3,
      setDepCount: vi.fn(),
      scannedDeps: 3,
      setScannedDeps: vi.fn(),
      depsAverageScore: undefined,
      setDepsAverageScore: vi.fn(),
      depLicenses: undefined,
      setDepLicenses: vi.fn(),
      depWarnings: Array.from(mockDepWarnings.values()),
      setDepWarnings: vi.fn(),
      duplicatedDeps: undefined,
      setDuplicatedDeps: vi.fn(),
    }),
  )

  const Container = () => {
    return <InsightsTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('InsightsTabContent renders with a warning for unscanned deps', () => {
  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector({
      selectedItem: SELECTED_ITEM,
      activeTab: 'dependencies',
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
      depCount: 3,
      setDepCount: vi.fn(),
      scannedDeps: 2,
      setScannedDeps: vi.fn(),
      depsAverageScore: 75,
      setDepsAverageScore: vi.fn(),
      depLicenses: undefined,
      setDepLicenses: vi.fn(),
      depWarnings: Array.from(mockDepWarnings.values()),
      setDepWarnings: vi.fn(),
      duplicatedDeps: undefined,
      setDuplicatedDeps: vi.fn(),
    }),
  )

  const Container = () => {
    return <InsightsTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
