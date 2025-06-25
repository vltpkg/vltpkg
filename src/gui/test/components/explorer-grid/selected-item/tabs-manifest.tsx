import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import type { SelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import {
  TabsManifestButton,
  TabsManifestContent,
} from '@/components/explorer-grid/selected-item/tabs-manifest.tsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
} from './__fixtures__/item.ts'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { Manifest } from '@vltpkg/types'

const MOCK_MANIFEST: Manifest = {
  name: 'acme-package',
  version: '1.0.0',
  author: 'John Doe',
  private: true,
  dependencies: {
    '@acme/1': '1.0.0',
    '@acme/2': '2.0.0',
  },
  devDependencies: {
    '@acme/3': '3.0.0',
    '@acme/4': '4.0.0',
  },
}

const ITEM_WITH_MANIFEST = {
  ...SELECTED_ITEM,
  to: {
    manifest: MOCK_MANIFEST,
  },
} as unknown as GridItemData

vi.mock('lucide-react', () => ({
  FileJson: 'gui-file-json-icon',
}))

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

vi.mock('@/components/ui/shiki.tsx', () => ({
  CodeBlock: 'gui-code-block',
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

test('TabsManifestButton renders default', () => {
  const mockState = {
    selectedItem: ITEM_WITH_MANIFEST,
    ...SELECTED_ITEM_DETAILS,
    manifest: {},
    rawManifest: null,
    insights: undefined,
    activeTab: 'manifest' as const,
    activeSubTab: undefined,
    setActiveSubTab: vi.fn(),
    setActiveTab: vi.fn(),
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
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <TabsManifestButton />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('TabsManifestContent renders an empty state', () => {
  const mockState = {
    manifest: null,
    rawManifest: null,
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    insights: undefined,
    activeTab: 'manifest' as const,
    activeSubTab: undefined,
    setActiveSubTab: vi.fn(),
    setActiveTab: vi.fn(),
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
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <TabsManifestContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('TabsManifestContent renders with a manifest', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    insights: undefined,
    activeTab: 'manifest' as const,
    activeSubTab: undefined,
    setActiveSubTab: vi.fn(),
    manifest: MOCK_MANIFEST,
    rawManifest: null,
    setActiveTab: vi.fn(),
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
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <TabsManifestContent />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
