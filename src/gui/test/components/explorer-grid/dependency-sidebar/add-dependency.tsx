import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { AddDependenciesPopover } from '@/components/explorer-grid/dependency-sidebar/add-dependency.tsx'
import { useDependencySidebarStore } from '@/components/explorer-grid/dependency-sidebar/context.tsx'

import type { DependencySidebarStore } from '@/components/explorer-grid/dependency-sidebar/context.tsx'

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/context.tsx',
  () => ({
    useDependencySidebarStore: vi.fn(),
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
  Plus: 'gui-plus-icon',
  BatteryLow: 'gui-battery-low-icon',
  PackageCheck: 'gui-package-check-icon',
  PackagePlus: 'gui-package-plus-icon',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/card.tsx', () => ({
  CardHeader: 'gui-card-header',
  CardTitle: 'gui-card-title',
}))

vi.mock('@/components/ui/input.tsx', () => ({
  Input: 'gui-input',
}))

vi.mock('@/components/ui/form-label.tsx', () => ({
  Label: 'gui-label',
}))

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipContent: 'gui-tooltip-content',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipPortal: 'gui-tooltip-portal',
}))

vi.mock('@/components/ui/popover.tsx', () => ({
  Popover: 'gui-popover',
  PopoverContent: 'gui-popover-content',
  PopoverTrigger: 'gui-popover-trigger',
}))

vi.mock('@/components/ui/select.tsx', () => ({
  Select: 'gui-select',
  SelectContent: 'gui-select-content',
  SelectItem: 'gui-select-item',
  SelectTrigger: 'gui-select-trigger',
  SelectValue: 'gui-select-value',
}))

vi.mock('@/components/ui/loading-spinner.tsx', () => ({
  LoadingSpinner: 'gui-loading-spinner',
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

test('add-dependencies-popover render default', async () => {
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
    return <AddDependenciesPopover />
  }

  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})

test('add-dependencies-popover error', async () => {
  const mockState = {
    dependencies: [],
    importerId: undefined,
    addedDependencies: [],
    uninstalledDependencies: [],
    inProgress: false,
    error: 'a mock error occured',
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
    return <AddDependenciesPopover />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('add-dependencies-popover in progress', async () => {
  const mockState = {
    dependencies: [],
    importerId: undefined,
    addedDependencies: [],
    uninstalledDependencies: [],
    inProgress: true,
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
    return <AddDependenciesPopover />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
