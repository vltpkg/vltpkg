import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, fireEvent } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import type { SelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import {
  VersionsTabButton,
  VersionsTabContent,
} from '@/components/explorer-grid/selected-item/tabs-versions.tsx'
import {
  SELECTED_ITEM,
  SELECTED_ITEM_DETAILS,
} from './__fixtures__/item.ts'
import type { Version } from '@/lib/external-info.ts'

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
})
window.IntersectionObserver = mockIntersectionObserver

const MOCK_VERSION = {
  version: '1.0.0',
  publishedDate: '2025-04-15',
  unpackedSize: 123456,
  integrity: 'sha512-abc123',
  tarball: 'https://example.com/tarball.tgz',
  publishedAuthor: {
    name: 'John Doe',
    email: 'johndoe@acme.com',
    avatar: 'https://example.com/avatar.jpg',
  },
} as Version

const MOCK_BETA_VERSION = {
  ...MOCK_VERSION,
  version: '2.0.0-beta.1',
  integrity: 'sha512-def456',
} as unknown as Version

vi.mock('lucide-react', () => ({
  History: 'gui-history-icon',
  ArrowUpDown: 'gui-arrow-up-down-icon',
  ChevronRight: 'gui-chevron-right-icon',
  Search: 'gui-search-icon',
  ListFilter: 'gui-list-filter-icon',
  CircleHelp: 'gui-circle-help-icon',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  () => ({
    useSelectedItemStore: vi.fn(),
    SelectedItemProvider: 'gui-selected-item-provider',
  }),
)

vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('2025-04-15'),
  formatDistanceStrict: vi.fn().mockReturnValue('1 day ago'),
}))

vi.mock('@/components/ui/tabs.tsx', () => ({
  TabsTrigger: 'gui-tabs-trigger',
  TabsContent: 'gui-tabs-content',
}))

vi.mock('@/components/ui/data-badge.tsx', () => ({
  DataBadge: 'gui-data-badge',
}))

vi.mock('@radix-ui/react-avatar', () => ({
  Avatar: 'gui-avatar',
  AvatarImage: 'gui-avatar-image',
  AvatarFallback: 'gui-avatar-fallback',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/copy-to-clipboard.tsx', () => ({
  CopyToClipboard: 'gui-copy-to-clipboard',
}))

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipContent: 'gui-tooltip-content',
  TooltipProvider: 'gui-tooltip-provider',
}))

vi.mock('@/components/ui/dropdown-menu.tsx', () => ({
  DropdownMenu: 'gui-dropdown-menu',
  DropdownMenuTrigger: 'gui-dropdown-menu-trigger',
  DropdownMenuContent: 'gui-dropdown-menu-content',
  DropdownMenuCheckboxItem: 'gui-dropdown-menu-checkbox-item',
}))

vi.mock('@/components/ui/input.tsx', () => ({
  Input: 'gui-input',
}))

vi.mock('@/components/ui/chart.tsx', () => ({
  ChartContainer: 'gui-chart-container',
  ChartTooltip: 'gui-chart-tooltip',
  ChartTooltipContent: 'gui-chart-tooltip-content',
}))

vi.mock('recharts', () => ({
  Bar: 'gui-recharts-bar',
  BarChart: 'gui-recharts-bar-chart',
  XAxis: 'gui-recharts-x-axis',
  CartesianGrid: 'gui-recharts-cartesian-grid',
}))

vi.mock('@/components/number-flow.tsx', () => ({
  NumberFlow: 'gui-number-flow',
}))

vi.mock('@/components/ui/separator.tsx', () => ({
  Separator: 'gui-separator',
}))

vi.mock('react-virtuoso', () => ({
  Virtuoso: 'gui-virtuoso',
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

test('VersionsTabButton renders default', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    versions: [MOCK_VERSION, { ...MOCK_VERSION, version: '1.0.2' }],
    greaterVersions: [{ ...MOCK_VERSION, version: '1.0.2' }],
    manifest: null,
    rawManifest: null,
    insights: undefined,
    activeTab: 'versions' as const,
    setActiveTab: vi.fn(),
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<VersionsTabButton />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('VersionsTabContent renders with versions', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    versions: [MOCK_VERSION, MOCK_BETA_VERSION],
    greaterVersions: [],
    manifest: {},
    rawManifest: null,
    insights: undefined,
    activeTab: 'versions' as const,
    setActiveTab: vi.fn(),
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<VersionsTabContent />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('VersionsTabContent renders an empty state', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    versions: [],
    greaterVersions: [],
    manifest: {},
    rawManifest: null,
    insights: undefined,
    activeTab: 'versions' as const,
    setActiveTab: vi.fn(),
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<VersionsTabContent />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('VersionsTabContent filters versions', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    versions: [MOCK_VERSION, MOCK_BETA_VERSION],
    greaterVersions: [],
    manifest: {},
    rawManifest: null,
    insights: undefined,
    activeTab: 'versions' as const,
    setActiveTab: vi.fn(),
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<VersionsTabContent />)
  const searchInput = container.querySelector(
    'input[placeholder="Filter versions"]',
  )
  if (searchInput) {
    fireEvent.change(searchInput, { target: { value: '1.0.0' } })
  }
  expect(container.innerHTML).toMatchSnapshot()
})

test('VersionsTabContent toggles pre-releases', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    versions: [MOCK_VERSION, MOCK_BETA_VERSION],
    greaterVersions: [],
    manifest: {},
    rawManifest: null,
    insights: undefined,
    activeTab: 'versions' as const,
    setActiveTab: vi.fn(),
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<VersionsTabContent />)
  const toggleButton = container.querySelector('button')
  if (toggleButton) {
    fireEvent.click(toggleButton)
  }
  expect(container.innerHTML).toMatchSnapshot()
})

test('VersionsTabContent filters pre-releases', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    versions: [MOCK_VERSION, MOCK_BETA_VERSION],
    greaterVersions: [],
    manifest: {
      version: '1.0.0',
    },
    rawManifest: null,
    insights: undefined,
    activeTab: 'versions' as const,
    setActiveTab: vi.fn(),
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<VersionsTabContent />)
  const filterButton = container.querySelector('button')
  if (filterButton) {
    fireEvent.click(filterButton)
  }
  const checkbox = container.querySelector('input[type="checkbox"]')
  if (checkbox) {
    fireEvent.click(checkbox)
  }
  expect(container.innerHTML).toMatchSnapshot()
})

test('VersionsTabContent filters newer versions', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    versions: [MOCK_VERSION, { ...MOCK_VERSION, version: '2.0.0' }],
    greaterVersions: [],
    manifest: {
      version: '1.0.0',
    },
    rawManifest: null,
    insights: undefined,
    activeTab: 'versions' as const,
    setActiveTab: vi.fn(),
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<VersionsTabContent />)
  const filterButton = container.querySelector('button')
  if (filterButton) {
    fireEvent.click(filterButton)
  }
  const checkboxes = container.querySelectorAll(
    'input[type="checkbox"]',
  )
  if (checkboxes[1]) {
    fireEvent.click(checkboxes[1])
  }
  expect(container.innerHTML).toMatchSnapshot()
})

test('VersionsTabContent handles missing manifest version', () => {
  const mockState = {
    selectedItem: SELECTED_ITEM,
    ...SELECTED_ITEM_DETAILS,
    versions: [MOCK_VERSION, { ...MOCK_VERSION, version: '2.0.0' }],
    greaterVersions: [],
    manifest: {},
    rawManifest: null,
    insights: undefined,
    activeTab: 'versions' as const,
    setActiveTab: vi.fn(),
  } satisfies SelectedItemStore

  vi.mocked(useSelectedItemStore).mockImplementation(selector =>
    selector(mockState),
  )

  const { container } = render(<VersionsTabContent />)
  const filterButton = container.querySelector('button')
  if (filterButton) {
    fireEvent.click(filterButton)
  }
  const checkboxes = container.querySelectorAll(
    'input[type="checkbox"]',
  )
  if (checkboxes[1]) {
    fireEvent.click(checkboxes[1])
  }
  expect(container.innerHTML).toMatchSnapshot()
})
