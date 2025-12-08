import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { OverviewTabContent } from '@/components/explorer-grid/selected-item/tabs-overview.tsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
  MOCK_LOADING_STATE,
} from './__fixtures__/item.ts'

import type { SelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { DetailsInfo } from '@/lib/external-info.ts'

const ITEM_WITH_DESCRIPTION = {
  ...SELECTED_ITEM,
  to: {
    name: 'item',
    version: '1.0.0',
    id: ['registry', 'custom', 'item@1.0.0'],
    manifest: {
      description: '## Description\n\nThis is a custom description',
    },
    rawManifest: null,
  },
} as unknown as GridItemData

const ITEM_DETAILS_WITH_AUTHOR = {
  ...SELECTED_ITEM_DETAILS,
  author: {
    name: 'John Doe',
    mail: 'johndoe@acme.com',
    email: 'johndoe@acme.com',
    url: 'https://acme.com/johndoe',
    web: 'https://acme.com/johndoe',
  },
} as unknown as DetailsInfo

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  () => ({
    useSelectedItemStore: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
    useTabNavigation: {
      tab: 'overview',
      subTab: undefined,
      setActiveTab: vi.fn(),
      setActiveSubTab: vi.fn(),
    },
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/focused-view/use-focus-state.tsx',
  () => ({
    useFocusState: vi.fn().mockReturnValue({
      focused: false,
      setFocused: vi.fn(),
    }),
  }),
)

vi.mock('@/components/markdown-components.tsx', () => ({
  Markdown: 'gui-markdown',
}))

vi.mock('lucide-react', () => ({
  FileText: 'gui-file-text-icon',
}))
vi.mock(
  '@/components/explorer-grid/selected-item/empty-state.tsx',
  () => ({
    SelectedItemEmptyState: 'gui-selected-item-empty-state',
  }),
)

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

test('OverviewTabContent renders with an empty state', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    manifest: {},
    rawManifest: null,
    insights: undefined,
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
    return <OverviewTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('OverviewTabContent renders with content', () => {
  const mockState = {
    selectedItem: ITEM_WITH_DESCRIPTION,
    ...ITEM_DETAILS_WITH_AUTHOR,
    insights: undefined,
    rawManifest: null,
    manifest: {
      description: '## Description\n\nThis is a custom description',
      keywords: ['testing', 'vitest'],
    },
    readme: '## Description\n\nThis is a custom description',
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
    return <OverviewTabContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
