import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import {
  getLicenseSeverity,
  useSelectedItemStore,
} from '@/components/explorer-grid/selected-item/context.tsx'
import {
  SELECTED_ITEM,
  MOCK_LOADING_STATE,
} from '../__fixtures__/item.ts'
import { LicensesTabContent } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-licenses.tsx'

import type { DepLicenses } from '@/components/explorer-grid/selected-item/context.tsx'

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
        subTab: 'licenses',
        setActiveTab: vi.fn(),
        setActiveSubTab: vi.fn(),
      },
    }
  },
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
  AlertTriangle: 'gui-alert-triangle-icon',
  Scale: 'gui-scale-icon',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/empty-state.tsx',
  () => ({
    SelectedItemEmptyState: 'gui-selected-item-empty-state',
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
  '@/components/explorer-grid/selected-item/tabs-dependencies/warning.tsx',
  () => ({
    Warning: 'gui-warning',
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

const mockDepLicenses: DepLicenses = {
  allLicenses: {
    unlicensed: 8,
    misc: 10,
    restricted: 6,
    ambiguous: 5,
    copyleft: 4,
    unknown: 3,
    none: 3,
    exception: 3,
  },
  byWarning: {
    unlicensed: {
      licenses: [
        'unlicensed',
        'unlicensed2',
        'unlicensed3',
        'unlicensed4',
      ],
      count: 4,
      severity: getLicenseSeverity('unlicensed'),
    },
    misc: {
      licenses: ['misc', 'misc2', 'misc3', 'misc4', 'misc5'],
      count: 5,
      severity: getLicenseSeverity('misc'),
    },
    restricted: {
      licenses: ['restricted', 'restricted2', 'restricted3'],
      count: 3,
      severity: getLicenseSeverity('restricted'),
    },
    ambiguous: {
      licenses: ['ambiguous', 'ambiguous2', 'ambiguous3'],
      count: 3,
      severity: getLicenseSeverity('ambiguous'),
    },
    copyleft: {
      licenses: ['copyleft', 'copyleft2', 'copyleft3'],
      count: 3,
      severity: getLicenseSeverity('copyleft'),
    },
    unknown: {
      licenses: ['unknown', 'unknown2', 'unknown3'],
      count: 3,
      severity: getLicenseSeverity('unknown'),
    },
    none: {
      licenses: ['none', 'none2', 'none3'],
      count: 3,
      severity: getLicenseSeverity('none'),
    },
    exception: {
      licenses: ['exception', 'exception2', 'exception3'],
      count: 3,
      severity: getLicenseSeverity('exception'),
    },
  },
  totalCount: 0,
} satisfies DepLicenses

test('LicensesTabContent renders with an empty state', () => {
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
      duplicatedDeps: undefined,
      setDuplicatedDeps: vi.fn(),
      depFunding: undefined,
      setDepFunding: vi.fn(),
      ...MOCK_LOADING_STATE,
    }),
  )

  const Container = () => {
    return <LicensesTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('LicensesTabContent renders with licenses', () => {
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
      depLicenses: mockDepLicenses,
      setDepLicenses: vi.fn(),
      depWarnings: undefined,
      setDepWarnings: vi.fn(),
      duplicatedDeps: undefined,
      setDuplicatedDeps: vi.fn(),
      depFunding: undefined,
      setDepFunding: vi.fn(),
      ...MOCK_LOADING_STATE,
    }),
  )

  const Container = () => {
    return <LicensesTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
