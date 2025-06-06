import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useDependencySidebarStore } from '@/components/explorer-grid/dependency-sidebar/context.tsx'
import { DependencyEmptyState } from '@/components/explorer-grid/dependency-sidebar/empty-state.tsx'
import type { DependencySidebarStore } from '@/components/explorer-grid/dependency-sidebar/context.tsx'

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

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/add-dependency.tsx',
  () => ({
    AddDependenciesPopover: 'gui-add-dependencies-popover',
  }),
)

vi.mock('@/components/ui/popover.tsx', () => ({
  Popover: 'gui-popover',
  PopoverTrigger: 'gui-popover-trigger',
  PopoverContent: 'gui-popover-content',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('lucide-react', () => ({
  Plus: 'gui-plus-icon',
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

test('dependency-empty-state renders default', () => {
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
    return <DependencyEmptyState />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
