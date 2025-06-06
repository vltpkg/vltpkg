import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { DependencySideBar } from '@/components/explorer-grid/dependency-sidebar/index.tsx'
import { useDependencySidebarStore } from '@/components/explorer-grid/dependency-sidebar/context.tsx'

import type { DependencySidebarStore } from '@/components/explorer-grid/dependency-sidebar/context.tsx'
import type { GridItemData } from '@/components/explorer-grid/types.ts'

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/context.tsx',
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

vi.mock('@/components/explorer-grid/header.tsx', () => ({
  GridHeader: 'gui-grid-header',
}))

vi.mock('@/components/explorer-grid/side-item.tsx', () => ({
  SideItem: 'gui-side-item',
}))

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/add-dependency.tsx',
  () => ({
    AddDependenciesPopoverTrigger:
      'gui-add-dependencies-popover-trigger',
  }),
)

vi.mock('@/components/number-flow.tsx', () => ({
  NumberFlow: 'gui-number-flow',
}))

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/filter.tsx',
  () => ({
    FilterButton: 'gui-filter-button',
    FilterList: 'gui-filter-list',
    FilterListEmptyState: 'gui-filter-list-empty-state',
  }),
)

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/empty-state.tsx',
  () => ({
    DependencyEmptyState: 'gui-dependency-empty-state',
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
  vi.clearAllMocks()
})

const getGridItemData = (
  name: string,
  id: string,
  depIndex: number,
) =>
  ({
    name,
    id,
    depIndex,
    toString: () => `GridItemData { ${name} }`,
  }) as GridItemData

test('dependency-side-bar', async () => {
  const dependencies = [
    getGridItemData('simple-output', '1', 0),
    getGridItemData('abbrev', '2', 1),
    getGridItemData('@vltpkg/semver', '3', 2),
  ]

  const mockState = {
    dependencies,
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
    filteredDependencies: dependencies,
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
    return (
      <DependencySideBar
        dependencies={dependencies}
        uninstalledDependencies={[]}
        onDependencyClick={() => () => {}}
      />
    )
  }

  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})

test('dependency-side-bar no items', async () => {
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
    return (
      <DependencySideBar
        dependencies={[]}
        uninstalledDependencies={[]}
        onDependencyClick={() => () => {}}
      />
    )
  }

  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})

test('dependency-side-bar has uninstalled deps only', async () => {
  const dependencies = [
    getGridItemData('simple-output', '1', 0),
    getGridItemData('abbrev', '2', 1),
    getGridItemData('@vltpkg/semver', '3', 2),
  ]

  const mockState = {
    dependencies: [],
    importerId: undefined,
    addedDependencies: [],
    uninstalledDependencies: dependencies,
    inProgress: false,
    error: undefined,
    dependencyPopoverOpen: false,
    onDependencyClick: () => () => {},
    setDependencyPopoverOpen: vi.fn(),
    setInProgress: vi.fn(),
    setError: vi.fn(),
    setAddedDependencies: vi.fn(),
    filteredDependencies: dependencies,
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
    return (
      <DependencySideBar
        dependencies={[]}
        uninstalledDependencies={dependencies}
        onDependencyClick={() => () => {}}
      />
    )
  }

  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})

test('dependency-side-bar has both installed and uninstalled deps', async () => {
  const dependencies = [
    getGridItemData('simple-output', '1', 0),
    getGridItemData('abbrev', '2', 1),
    getGridItemData('@vltpkg/semver', '3', 2),
  ]

  const uninstalledDependencies = [
    getGridItemData('@ruyadorno/redact', '4', 3),
    getGridItemData('ntl', '1', 4),
  ]

  const mockState = {
    dependencies: dependencies,
    importerId: undefined,
    addedDependencies: [],
    uninstalledDependencies: uninstalledDependencies,
    inProgress: false,
    error: undefined,
    dependencyPopoverOpen: false,
    onDependencyClick: () => () => {},
    setDependencyPopoverOpen: vi.fn(),
    setInProgress: vi.fn(),
    setError: vi.fn(),
    setAddedDependencies: vi.fn(),
    filteredDependencies: dependencies,
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
    return (
      <DependencySideBar
        dependencies={dependencies}
        uninstalledDependencies={uninstalledDependencies}
        onDependencyClick={() => () => {}}
      />
    )
  }

  const { container } = render(<Container />)

  expect(container.innerHTML).toMatchSnapshot()
})
