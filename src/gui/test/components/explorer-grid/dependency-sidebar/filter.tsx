import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useDependencySidebarStore } from '@/components/explorer-grid/dependency-sidebar/context.tsx'
import {
  FilterButton,
  FilterList,
  FilterListEmptyState,
} from '@/components/explorer-grid/dependency-sidebar/filter.tsx'
import type { DependencySidebarStore } from '@/components/explorer-grid/dependency-sidebar/context.tsx'
import type { Filter } from '@/components/explorer-grid/dependency-sidebar/filter-config.tsx'

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/context',
  () => ({
    useDependencySidebarStore: vi.fn(),
    DependencySidebarProvider: 'gui-dependency-sidebar-provider',
    usePopover: vi.fn().mockReturnValue({
      toggleAddDepPopover: vi.fn(),
      dependencyPopoverOpen: true,
      setDependencyPopoverOpen: vi.fn(),
    }),
    useOperation: vi.fn().mockReturnValue({
      operation: vi.fn(),
    }),
  }),
)

vi.mock('lucide-react', () => ({
  Check: 'gui-check',
  CornerDownRight: 'gui-corner-down-right',
  ListFilter: 'gui-list-filter',
  CircleDot: 'gui-circle-dot',
  Search: 'gui-search',
  RotateCcw: 'gui-rotate-ccw',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/input.tsx', () => ({
  Input: 'gui-input',
}))

vi.mock('@/components/ui/badge.tsx', () => ({
  Badge: 'gui-badge',
}))

vi.mock('@/components/ui/dropdown-menu.tsx', () => ({
  DropdownMenu: 'gui-dropdown-menu',
  DropdownMenuTrigger: 'gui-dropdown-menu-trigger',
  DropdownMenuContent: 'gui-dropdown-menu-content',
  DropdownMenuPortal: 'gui-dropdown-menu-portal',
  DropdownMenuGroup: 'gui-dropdown-menu-group',
  DropdownMenuItem: 'gui-dropdown-menu-item',
  DropdownMenuSub: 'gui-dropdown-menu-sub',
  DropdownMenuSubTrigger: 'gui-dropdown-menu-sub-trigger',
  DropdownMenuSubContent: 'gui-dropdown-menu-sub-content',
  DropdownMenuSeparator: 'gui-dropdown-menu-separator',
}))

vi.mock('@/components/ui/tooltip.tsx', () => ({
  TooltipProvider: 'gui-tooltip-provider',
  Tooltip: 'gui-tooltip',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipContent: 'gui-tooltip-content',
  TooltipPortal: 'gui-tooltip-portal',
}))

vi.mock('@/components/ui/kbd.tsx', () => ({
  Kbd: 'gui-kbd',
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
  vi.clearAllMocks()
})

test('filter-button renders default', () => {
  const mockState = {
    dependencies: [],
    importerId: undefined,
    addedDependencies: [],
    uninstalledDependencies: [],
    inProgress: false,
    error: undefined,
    dependencyPopoverOpen: false,
    onDependencyClick: () => () => {},
    setDependencyPopoverOpen: vi.fn(),
    setInProgress: vi.fn(),
    setError: vi.fn(),
    setAddedDependencies: vi.fn(),
    filteredDependencies: [],
    filters: [],
    searchTerm: '',
    setSearchTerm: vi.fn(),
    setFilters: vi.fn(),
    setFilteredDependencies: vi.fn(),
  } satisfies DependencySidebarStore

  vi.mocked(useDependencySidebarStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <FilterButton />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('filter-list renders with filters', () => {
  const filters = ['prod', 'dev', 'peer'] as Filter[]

  const mockState = {
    dependencies: [],
    importerId: undefined,
    addedDependencies: [],
    uninstalledDependencies: [],
    inProgress: false,
    error: undefined,
    dependencyPopoverOpen: false,
    onDependencyClick: () => () => {},
    setDependencyPopoverOpen: vi.fn(),
    setInProgress: vi.fn(),
    setError: vi.fn(),
    setAddedDependencies: vi.fn(),
    filteredDependencies: [],
    filters,
    searchTerm: '',
    setSearchTerm: vi.fn(),
    setFilters: vi.fn(),
    setFilteredDependencies: vi.fn(),
  } satisfies DependencySidebarStore

  vi.mocked(useDependencySidebarStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <FilterList />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('filter-list-empty-state renders when no matching filters are found', () => {
  const filters = ['prod'] as Filter[]

  const mockState = {
    dependencies: [],
    importerId: undefined,
    addedDependencies: [],
    uninstalledDependencies: [],
    inProgress: false,
    error: undefined,
    dependencyPopoverOpen: false,
    onDependencyClick: () => () => {},
    setDependencyPopoverOpen: vi.fn(),
    setInProgress: vi.fn(),
    setError: vi.fn(),
    setAddedDependencies: vi.fn(),
    filteredDependencies: [],
    filters,
    searchTerm: '',
    setSearchTerm: vi.fn(),
    setFilters: vi.fn(),
    setFilteredDependencies: vi.fn(),
  } satisfies DependencySidebarStore

  vi.mocked(useDependencySidebarStore).mockImplementation(selector =>
    selector(mockState),
  )

  const Container = () => {
    return <FilterListEmptyState />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
