import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import {
  SELECTED_ITEM,
  MOCK_LOADING_STATE,
} from '../__fixtures__/item.ts'
import { DependenciesTabContent } from '@/components/explorer-grid/selected-item/tabs-dependencies/index.tsx'

vi.mock('react-router', () => ({
  Outlet: 'gui-router-outlet',
}))

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
      useTabNavigation: vi.fn(() => ({
        tab: 'dependencies',
        subTab: 'insights',
        setActiveTab: vi.fn(),
        setActiveSubTab: vi.fn(),
      })),
    }
  },
)

vi.mock(
  '@/components/explorer-grid/selected-item/navigation.tsx',
  () => ({
    Navigation: 'gui-navigation',
    NavigationButton: 'gui-navigation-button',
    NavigationList: 'gui-navigation-list',
    NavigationListItem: 'gui-navigation-list-item',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-insights.tsx',
  () => ({
    InsightsTabContent: 'gui-insights-tab-content',
  }),
)
vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-licenses.tsx',
  () => ({
    LicensesTabContent: 'gui-licenses-tab-content',
  }),
)
vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-funding.tsx',
  () => ({
    FundingTabContent: 'gui-funding-tab-content',
  }),
)
vi.mock(
  '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-duplicates.tsx',
  () => ({
    DuplicatesTabContent: 'gui-duplicates-tab-content',
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

test('DependenciesTabContent renders default', () => {
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
      depCount: 2,
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
    return <DependenciesTabContent />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('DependenciesTabContent renders an empty state', () => {
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
      depCount: 2,
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
    return <DependenciesTabContent />
  }
  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
