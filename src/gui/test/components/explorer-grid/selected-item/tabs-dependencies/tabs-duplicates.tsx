import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import {
  SELECTED_ITEM,
  MOCK_LOADING_STATE,
  MOCK_STORE_STATE,
  MOCK_STORE_ACTIONS,
} from '../__fixtures__/item.ts'
import { DuplicatesTabContent } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-duplicates.tsx'

import type { DuplicatedDeps } from '@/components/explorer-grid/selected-item/context.tsx'

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  async () => {
    const actual =
      await import('@/components/explorer-grid/selected-item/context.tsx')
    return {
      ...actual,
      useSelectedItemStore: vi.fn(),
      SelectedItemProvider: 'gui-selected-item-provider',
      useTabNavigation: {
        tab: 'dependencies',
        subTab: 'duplicates',
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

test('DuplicatesTabContent renders with an empty state', () => {
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
      scannedDeps: undefined,
      depsAverageScore: undefined,
      depLicenses: undefined,
      depWarnings: undefined,
      duplicatedDeps: undefined,
      depFunding: undefined,
      ...MOCK_STORE_ACTIONS,
      ...MOCK_LOADING_STATE,
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
      ...MOCK_STORE_STATE,
      duplicatedDeps: mockDuplicatedDeps,
      ...MOCK_STORE_ACTIONS,
      ...MOCK_LOADING_STATE,
    }),
  )

  const Container = () => {
    return <DuplicatesTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
