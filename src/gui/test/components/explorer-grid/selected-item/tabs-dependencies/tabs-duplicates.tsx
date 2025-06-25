import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { SELECTED_ITEM } from '../__fixtures__/item.ts'
import {
  DuplicatesTabButton,
  DuplicatesTabContent,
} from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-duplicates.tsx'
import type { DuplicatedDeps } from '@/components/explorer-grid/selected-item/context.tsx'

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
    }
  },
)

vi.mock('@/components/ui/tabs.tsx', () => ({
  TabsTrigger: 'gui-tabs-trigger',
  TabsContent: 'gui-tabs-content',
}))

vi.mock('@/components/ui/data-badge.tsx', () => ({
  DataBadge: 'gui-data-badge',
}))

vi.mock('lucide-react', () => ({
  Blocks: 'gui-blocks-icon',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/empty-state.tsx',
  () => ({
    EmptyState: 'gui-empty-state',
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

const mockDuplicatedDeps = {
  next: {
    count: 2,
    versions: ['12.0.0', '12.1.0'],
  },
  react: {
    count: 3,
    versions: ['17.0.2', '18.0.0', '18.1.0'],
  },
  lodash: {
    count: 1,
    versions: ['4.17.21'],
  },
} satisfies DuplicatedDeps

test('DuplicatesTabButton renders correctly', () => {
  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector({
      selectedItem: SELECTED_ITEM,
      activeTab: 'dependencies',
      setActiveTab: vi.fn(),
      activeSubTab: 'duplicates',
      setActiveSubTab: vi.fn(),
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
    }),
  )

  const Container = () => {
    return <DuplicatesTabButton />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('DuplicatesTabButton renders with a count', () => {
  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector({
      selectedItem: SELECTED_ITEM,
      activeTab: 'dependencies',
      activeSubTab: 'duplicates',
      setActiveSubTab: vi.fn(),
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
      duplicatedDeps: mockDuplicatedDeps,
      setDuplicatedDeps: vi.fn(),
      depFunding: undefined,
      setDepFunding: vi.fn(),
    }),
  )

  const Container = () => {
    return <DuplicatesTabButton />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('DuplicatesTabContent renders with an empty state', () => {
  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector({
      selectedItem: SELECTED_ITEM,
      activeTab: 'dependencies',
      activeSubTab: 'duplicates',
      setActiveSubTab: vi.fn(),
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
      depFunding: undefined,
      setDepFunding: vi.fn(),
    }),
  )

  const Container = () => {
    return <DuplicatesTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('DuplicatesTabContent renders with duplicated deps', () => {
  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector({
      selectedItem: SELECTED_ITEM,
      activeTab: 'dependencies',
      activeSubTab: 'duplicates',
      setActiveSubTab: vi.fn(),
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
      duplicatedDeps: mockDuplicatedDeps,
      setDuplicatedDeps: vi.fn(),
      depFunding: undefined,
      setDepFunding: vi.fn(),
    }),
  )

  const Container = () => {
    return <DuplicatesTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
