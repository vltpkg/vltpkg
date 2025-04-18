import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { ItemHeader } from '@/components/explorer-grid/selected-item/item-header.jsx'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import {
  specOptions,
  SELECTED_ITEM,
  SELECTED_ITEM_CUSTOM_REGISTRY,
  SELECTED_ITEM_SCOPED_REGISTRY,
  SELECTED_ITEM_DEFAULT_GIT_HOST,
  SELECTED_ITEM_DETAILS,
} from './__fixtures__/item.ts'
import type { SocketSecurityDetails } from '@/lib/constants/socket.js'
import type { PackageScore } from '@vltpkg/security-archive'

vi.mock(
  '@/components/explorer-grid/selected-item/context.jsx',
  () => ({
    useSelectedItem: vi.fn(),
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

vi.mock('@/components/ui/inline-code.jsx', () => ({
  InlineCode: 'gui-inline-code',
}))

vi.mock('@/components/ui/badge.jsx', () => ({
  Badge: 'gui-badge',
}))

vi.mock('@/components/ui/spark-chart.jsx', () => ({
  SparkBarChart: 'gui-spark-bar-chart',
}))

vi.mock('@/components/ui/progress-bar.jsx', () => ({
  ProgressBar: 'gui-progress-bar',
}))

vi.mock('@/components/icons/glyph-icon.jsx', async () => {
  const actual = await import('@/components/icons/glyph-icon.jsx')
  return {
    ...actual,
    GlyphIcon: 'gui-glyph-icon',
  }
})

vi.mock('@/components/ui/copy-to-clipboard.jsx', () => ({
  CopyToClipboard: 'gui-copy-to-clipboard',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/insight-badge.jsx',
  async () => {
    const actual = await import(
      '@/components/explorer-grid/selected-item/insight-badge.jsx'
    )
    return {
      ...actual,
      InsightBadge: 'gui-insight-badge',
    }
  },
)

vi.mock('@/components/ui/scroll-area.jsx', () => ({
  ScrollArea: 'gui-scroll-area',
  ScrollBar: 'gui-scroll-bar',
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
  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    selectedItemDetails: SELECTED_ITEM_DETAILS,
    insights: undefined,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
  })

  const Container = () => {
    return <ItemHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('ItemHeader renders with custom registry item', () => {
  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM_CUSTOM_REGISTRY,
    selectedItemDetails: SELECTED_ITEM_DETAILS,
    insights: undefined,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
  })

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
  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM_SCOPED_REGISTRY,
    selectedItemDetails: SELECTED_ITEM_DETAILS,
    insights: undefined,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
  })

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
  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM_DEFAULT_GIT_HOST,
    selectedItemDetails: SELECTED_ITEM_DETAILS,
    insights: undefined,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
  })

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
  const mockPackageScore: PackageScore = {
    overall: 0.8,
    license: 0.9,
    maintenance: 0.7,
    quality: 0.6,
    supplyChain: 0.5,
    vulnerability: 0.4,
  }

  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    selectedItemDetails: SELECTED_ITEM_DETAILS,
    insights: undefined,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
    packageScore: mockPackageScore,
  })

  const Container = () => {
    return <ItemHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('ItemHeader renders with insights', () => {
  const mockedInsights: SocketSecurityDetails[] = [
    {
      selector: ':abandoned',
      description: 'Abandoned packages',
      category: 'Supply Chain',
      severity: 'medium',
    },
  ]

  vi.mocked(useSelectedItem).mockReturnValue({
    selectedItem: SELECTED_ITEM,
    selectedItemDetails: SELECTED_ITEM_DETAILS,
    insights: mockedInsights,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
  })

  const Container = () => {
    return <ItemHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
