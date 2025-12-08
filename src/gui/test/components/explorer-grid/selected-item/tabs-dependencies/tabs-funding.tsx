import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import {
  SELECTED_ITEM,
  MOCK_LOADING_STATE,
} from '../__fixtures__/item.ts'
import { FundingTabContent } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-funding.tsx'

import type { DepFunding } from '@/components/explorer-grid/selected-item/context.tsx'

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  async () => {
    const actual = await import(
      '@/components/explorer-grid/selected-item/context.tsx'
    )
    return {
      ...actual,
      useSelectedItemStore: vi.fn(),
      SelectedItemProvider: 'gui-selected-item-provider',
      useTabNavigation: {
        tab: 'dependencies',
        subTab: 'funding',
        setActiveTab: vi.fn(),
        setActiveSubTab: vi.fn(),
      },
    }
  },
)

vi.mock(
  '@/components/explorer-grid/selected-item/empty-state.tsx',
  () => ({
    SelectedItemEmptyState: 'gui-selected-item-empty-state',
  }),
)

vi.mock('@/components/ui/table.tsx', () => ({
  Table: 'gui-table',
  TableBody: 'gui-table-body',
  TableCell: 'gui-table-cell',
  TableHead: 'gui-table-head',
  TableHeader: 'gui-table-header',
  TableRow: 'gui-table-row',
}))

vi.mock('lucide-react', () => ({
  HeartHandshake: 'gui-heart-handshake-icon',
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

const mockDepFunding = {
  darcyclake: {
    type: 'github',
    url: 'https://www.github.com/darcyclarke',
    count: 4,
  },
  ruyadorno: {
    type: 'github',
    url: 'https://www.github.com/ruyadorno',
    count: 4,
  },
} satisfies DepFunding

test('FundingTabContent renders with an empty state ', () => {
  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector({
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
      depFunding: undefined,
      setDepFunding: vi.fn(),
      duplicatedDeps: undefined,
      setDuplicatedDeps: vi.fn(),
      ...MOCK_LOADING_STATE,
    }),
  )

  const Container = () => {
    return <FundingTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('FundingTabContent renders with an funding', () => {
  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector({
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
      depFunding: mockDepFunding,
      setDepFunding: vi.fn(),
      duplicatedDeps: undefined,
      setDuplicatedDeps: vi.fn(),
      ...MOCK_LOADING_STATE,
    }),
  )

  const Container = () => {
    return <FundingTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
