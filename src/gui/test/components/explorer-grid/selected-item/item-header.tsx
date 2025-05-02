import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { ItemHeader } from '@/components/explorer-grid/selected-item/item-header.jsx'
import type { SelectedItemStore } from '@/components/explorer-grid/selected-item/context.jsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.jsx'
import {
  specOptions,
  SELECTED_ITEM,
  SELECTED_ITEM_CUSTOM_REGISTRY,
  SELECTED_ITEM_SCOPED_REGISTRY,
  SELECTED_ITEM_DEFAULT_GIT_HOST,
  SELECTED_ITEM_DETAILS,
} from './__fixtures__/item.js'
import type { SocketSecurityDetails } from '@/lib/constants/socket.js'
import type { PackageScore } from '@vltpkg/security-archive'

const MOCK_PACKAGE_SCORE: PackageScore = {
  overall: 0.8,
  license: 0.9,
  maintenance: 0.7,
  quality: 0.6,
  supplyChain: 0.5,
  vulnerability: 0.4,
}

const MOCK_INSIGHTS: SocketSecurityDetails[] = [
  {
    selector: ':abandoned',
    description: 'Abandoned packages',
    category: 'Supply Chain',
    severity: 'medium',
  },
]

vi.mock(
  '@/components/explorer-grid/selected-item/context.jsx',
  () => ({
    useSelectedItemStore: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
  }),
)

vi.mock('@radix-ui/react-avatar', () => ({
  Avatar: 'gui-avatar',
  AvatarImage: 'gui-avatar-image',
  AvatarFallback: 'gui-avatar-fallback',
}))

vi.mock('@/components/ui/tooltip.jsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipContent: 'gui-tooltip-content',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipProvider: 'gui-tooltip-provider',
}))

vi.mock('lucide-react', () => ({
  Home: 'gui-home-icon',
  Scale: 'gui-scale-icon',
  ArrowBigUpDash: 'gui-arrow-big-up-dash-icon',
  EyeOff: 'gui-eye-off-icon',
  Download: 'gui-download-icon',
  Package: 'gui-package-icon',
}))

vi.mock('@/components/ui/progress-bar.jsx', () => ({
  ProgressBar: 'gui-progress-bar',
}))

vi.mock('@/components/icons/index.js', () => ({
  Npm: 'gui-npm-icon',
  Node: 'gui-node-icon',
  Yarn: 'gui-yarn-icon',
  Pnpm: 'gui-pnpm-icon',
  Deno: 'gui-deno-icon',
  Bun: 'gui-bun-icon',
}))

vi.mock('@/components/ui/scroll-area.jsx', () => ({
  ScrollArea: 'gui-scroll-area',
  ScrollBar: 'gui-scroll-bar',
}))

vi.mock('@/components/ui/data-badge.jsx', () => ({
  DataBadge: 'gui-data-badge',
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

test('ItemHeader renders with default item', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
    manifest: null,
    rawManifest: null,
    packageScore: undefined,
    insights: undefined,
    author: undefined,
    versions: undefined,
    ...SELECTED_ITEM_DETAILS,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <ItemHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('ItemHeader renders with custom registry item', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM_CUSTOM_REGISTRY,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
    manifest: null,
    rawManifest: null,
    packageScore: undefined,
    insights: undefined,
    author: undefined,
    versions: undefined,
    ...SELECTED_ITEM_DETAILS,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    const updateSpecOptions = useStore(
      state => state.updateSpecOptions,
    )

    updateSpecOptions(specOptions)

    return <ItemHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('ItemHeader renders with scoped registry item', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM_SCOPED_REGISTRY,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
    manifest: null,
    rawManifest: null,
    packageScore: undefined,
    insights: undefined,
    author: undefined,
    versions: undefined,
    ...SELECTED_ITEM_DETAILS,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    const updateSpecOptions = useStore(
      state => state.updateSpecOptions,
    )

    updateSpecOptions({
      ...specOptions,
      'scope-registries': {
        '@myscope': 'http://custom-scope',
      },
    })

    return <ItemHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('ItemHeader renders with default git host item', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM_DEFAULT_GIT_HOST,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
    manifest: null,
    rawManifest: null,
    packageScore: undefined,
    insights: undefined,
    author: undefined,
    versions: undefined,
    ...SELECTED_ITEM_DETAILS,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    const updateSpecOptions = useStore(
      state => state.updateSpecOptions,
    )

    updateSpecOptions(specOptions)

    return <ItemHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('ItemHeader renders with a package score', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
    manifest: null,
    rawManifest: null,
    packageScore: MOCK_PACKAGE_SCORE,
    insights: undefined,
    author: undefined,
    versions: undefined,
    ...SELECTED_ITEM_DETAILS,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <ItemHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('ItemHeader renders with insights', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
    manifest: null,
    rawManifest: null,
    packageScore: undefined,
    insights: MOCK_INSIGHTS,
    author: undefined,
    versions: undefined,
    ...SELECTED_ITEM_DETAILS,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <ItemHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('ItemHeader renders with a version information', () => {
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
  } satisfies SelectedItemStore['manifest']

  const mockState = {
    selectedItem: SELECTED_ITEM,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
    manifest: mockManifest,
    rawManifest: null,
    packageScore: undefined,
    insights: MOCK_INSIGHTS,
    author: undefined,
    versions: mockVersions,
    ...SELECTED_ITEM_DETAILS,
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <ItemHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
