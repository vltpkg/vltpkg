import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import {
  Publisher,
  PackageImageSpec,
  ItemBreadcrumbs,
} from '@/components/explorer-grid/selected-item/item-header.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { getBreadcrumbs } from '@/components/navigation/crumb-nav.tsx'
import {
  specOptions,
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
  MOCK_LOADING_STATE,
} from './__fixtures__/item.ts'
import type { SelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  () => ({
    useSelectedItemStore: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
    useTabNavigation: vi.fn(() => ({
      tab: 'overview',
      subTab: undefined,
      setActiveTab: vi.fn(),
      setActiveSubTab: vi.fn(),
    })),
  }),
)

vi.mock('@radix-ui/react-avatar', () => ({
  Avatar: 'gui-avatar',
  AvatarImage: 'gui-avatar-image',
  AvatarFallback: 'gui-avatar-fallback',
}))

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipContent: 'gui-tooltip-content',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipPortal: 'gui-tooltip-portal',
}))

vi.mock('lucide-react', () => ({
  Home: 'gui-home-icon',
  ArrowBigUpDash: 'gui-arrow-big-up-dash-icon',
  Dot: 'gui-dot-icon',
}))

vi.mock('@/components/ui/scroll-area.tsx', () => ({
  ScrollArea: 'gui-scroll-area',
  ScrollBar: 'gui-scroll-bar',
}))

vi.mock('@/components/ui/data-badge.tsx', () => ({
  DataBadge: 'gui-data-badge',
}))

vi.mock('@/components/ui/progress-circle.tsx', () => ({
  ProgressCircle: 'gui-progress-circle',
}))

vi.mock(
  '@/components/navigation/crumb-nav.tsx',
  async importOriginal => {
    const actual =
      await importOriginal<
        typeof import('@/components/navigation/crumb-nav.tsx')
      >()
    return {
      ...actual,
      CrumbNav: 'gui-crumb-nav',
    }
  },
)

vi.mock('date-fns', () => ({
  formatDistanceStrict: vi.fn(() => '2 days ago'),
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

test('ItemBreadcrumbs renders with breadcrumbs', () => {
  const mockBreadcrumbs = getBreadcrumbs(':root > #express')

  const mockState = {
    selectedItem: {
      ...SELECTED_ITEM,
      breadcrumbs: mockBreadcrumbs,
    },
    packageScore: undefined,
    insights: undefined,
    author: undefined,
    versions: undefined,
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
    ...SELECTED_ITEM_DETAILS,
    ...MOCK_LOADING_STATE,
    manifest: null,
    rawManifest: null,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<ItemBreadcrumbs />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('ItemBreadcrumbs renders null when no breadcrumbs', () => {
  const mockState = {
    selectedItem: {
      ...SELECTED_ITEM,
      breadcrumbs: undefined,
    },
    packageScore: undefined,
    insights: undefined,
    author: undefined,
    versions: undefined,
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
    ...SELECTED_ITEM_DETAILS,
    ...MOCK_LOADING_STATE,
    manifest: null,
    rawManifest: null,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<ItemBreadcrumbs />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('PackageImageSpec renders with default item', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    packageScore: undefined,
    insights: undefined,
    author: undefined,
    versions: undefined,
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
    favicon: SELECTED_ITEM_DETAILS.favicon,
    ...SELECTED_ITEM_DETAILS,
    ...MOCK_LOADING_STATE,
    manifest: null,
    rawManifest: null,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    const updateSpecOptions = useStore(
      state => state.updateSpecOptions,
    )
    updateSpecOptions(specOptions)

    return <PackageImageSpec />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('PackageImageSpec renders with package score', () => {
  const mockPackageScore = {
    overall: 0.8,
    license: 0.9,
    maintenance: 0.7,
    quality: 0.6,
    supplyChain: 0.5,
    vulnerability: 0.4,
  }

  const mockState = {
    selectedItem: SELECTED_ITEM,
    packageScore: mockPackageScore,
    insights: undefined,
    author: undefined,
    versions: undefined,
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
    favicon: SELECTED_ITEM_DETAILS.favicon,
    ...SELECTED_ITEM_DETAILS,
    ...MOCK_LOADING_STATE,
    manifest: null,
    rawManifest: null,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    const updateSpecOptions = useStore(
      state => state.updateSpecOptions,
    )
    updateSpecOptions(specOptions)

    return <PackageImageSpec />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('Publisher renders with publisher information', () => {
  const mockVersions = [
    {
      version: '1.0.0',
      publishedDate: '2023-01-01T00:00:00Z',
      gitHead: 'abc123',
      publishedAuthor: {
        name: 'John Doe',
        email: 'johndoe@acme.com',
        avatar: 'https://example.com/avatar.jpg',
      },
      unpackedSize: 123456,
      integrity: 'sha512-abc123',
      tarball: 'https://example.com/tarball.tgz',
    },
  ] satisfies SelectedItemStore['versions']

  const mockManifest = {
    version: '1.0.0',
  } as SelectedItemStore['manifest']

  const mockState = {
    selectedItem: SELECTED_ITEM,
    packageScore: undefined,
    insights: undefined,
    author: undefined,
    versions: mockVersions,
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
    publisher: SELECTED_ITEM_DETAILS.publisher,
    publisherAvatar: SELECTED_ITEM_DETAILS.publisherAvatar,
    downloadsPerVersion: SELECTED_ITEM_DETAILS.downloadsPerVersion,
    ...SELECTED_ITEM_DETAILS,
    ...MOCK_LOADING_STATE,
    manifest: mockManifest,
    rawManifest: null,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<Publisher />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('Publisher renders null when no publisher', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    packageScore: undefined,
    insights: undefined,
    author: undefined,
    versions: undefined,
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
    ...SELECTED_ITEM_DETAILS,
    ...MOCK_LOADING_STATE,
    publisher: undefined,
    publisherAvatar: undefined,
    downloadsPerVersion: undefined,
    manifest: null,
    rawManifest: null,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<Publisher />)
  expect(container.innerHTML).toMatchSnapshot()
})
