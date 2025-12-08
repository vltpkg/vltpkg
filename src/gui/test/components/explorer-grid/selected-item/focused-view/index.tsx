import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { FocusedView } from '@/components/explorer-grid/selected-item/focused-view/index.tsx'

import type { GridItemData } from '@/components/explorer-grid/types.ts'

vi.mock('react-router', () => ({
  Outlet: 'gui-router-outlet',
  useParams: vi.fn().mockReturnValue({
    package: 'acme',
    version: 'latest',
  }),
  useNavigate: vi.fn(),
}))

vi.mock(
  '@/components/explorer-grid/selected-item/context.tsx',
  async () => {
    const actual = await import(
      '@/components/explorer-grid/selected-item/context.tsx'
    )
    return {
      ...actual,
      useSelectedItemStore: vi.fn(),
      SelectedItemProvider: 'gui-selected-item-provider',
    }
  },
)

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/context.tsx',
  async () => {
    const actual = await import(
      '@/components/explorer-grid/dependency-sidebar/context.tsx'
    )
    return {
      ...actual,
      DependencySidebarProvider: 'gui-dependency-sidebar-provider',
      useDependencySidebarStore: vi.fn(),
    }
  },
)

vi.mock(
  '@/components/explorer-grid/selected-item/item-header.tsx',
  () => ({
    ItemHeader: 'gui-item-header',
  }),
)

vi.mock('@/components/ui/jelly-spinner.tsx', () => ({
  JellyTriangleSpinner: 'gui-jelly-triangle-spinner',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/partial-errors-indicator.tsx',
  () => ({
    PartialErrorsIndicator: 'gui-partial-errors-indicator',
  }),
)

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/filter.tsx',
  () => ({
    FilterButton: 'gui-filter-button',
  }),
)

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/add-dependency.tsx',
  () => ({
    AddDependenciesPopoverTrigger:
      'gui-add-dependencies-popover-trigger',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/navigation.tsx',
  () => ({
    Navigation: 'gui-navigation',
    NavigationButton: 'gui-navigation-button',
    NavigationList: 'gui-navigation-list',
    NavigationListItem: 'gui-navigation-list-item',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/item-header.tsx',
  () => ({
    PackageImageSpec: 'gui-package-image-spec',
    ItemBreadcrumbs: 'gui-item-breadcrumbs',
    Publisher: 'gui-publisher',
  }),
)

vi.mock(
  '@/components/explorer-grid/dependency-sidebar/index.tsx',
  () => ({
    DependencySideBar: 'gui-dependency-sidebar',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/aside/index.tsx',
  () => ({
    AsideOverview: 'gui-aside-overview',
  }),
)

vi.mock(
  '@/components/explorer-grid/selected-item/aside/empty-state.tsx',
  () => ({
    AsideOverviewEmptyState: 'gui-aside-overview-empty-state',
  }),
)

vi.mock('@/components/ui/decorator.tsx', () => ({
  Decorator: 'gui-decorator',
}))

vi.mock(
  '@/components/explorer-grid/selected-item/focused-view/install-helper.tsx',
  () => ({
    InstallHelper: 'gui-install-helper',
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

test('FocusedView renders default', () => {
  const mockItem = {
    id: '1',
    labels: ['prod'],
    name: 'item',
    title: 'item',
    version: '1.0.0',
    sameItems: false,
    stacked: false,
    size: 1,
  } satisfies GridItemData

  const mockDependencies: GridItemData[] = []
  const mockUninstalledDependencies: GridItemData[] = []
  const mockOnDependencyClick = vi.fn(() => () => undefined)

  const Container = () => {
    return (
      <FocusedView
        item={mockItem}
        dependencies={mockDependencies}
        onDependencyClick={mockOnDependencyClick}
        uninstalledDependencies={mockUninstalledDependencies}
      />
    )
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
