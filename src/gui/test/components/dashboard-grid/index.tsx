import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { DashboardGrid } from '@/components/dashboard-grid/index.tsx'

import type { DashboardTools } from '@/state/types.ts'

vi.mock('@/components/hooks/use-dashboard-root-check.tsx', () => {
  const useDashboardRootCheck = vi.fn(() => ({
    hasDashboard: true,
    isLoading: false,
    dashboardRoots: ['/user/project-foo', '/user/project-bar'],
  }))
  return { useDashboardRootCheck }
})

import { useDashboardRootCheck } from '@/components/hooks/use-dashboard-root-check.tsx'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
  NavLink: 'gui-nav-link',
}))

vi.mock('@/utils/dashboard-tools.tsx', () => ({
  getIconSet: vi.fn((tools: DashboardTools[]) => {
    const mockRuntimes: Partial<Record<DashboardTools, string>> = {
      node: 'gui-runtime-node-icon',
      deno: 'gui-runtime-deno-icon',
      js: 'gui-runtime-js-icon',
      bun: 'gui-runtime-bun-icon',
    }

    const mockPackageManagers: Partial<
      Record<DashboardTools, string>
    > = {
      npm: 'gui-package-manager-npm-icon',
      pnpm: 'gui-package-manager-pnpm-icon',
      yarn: 'gui-package-manager-yarn-icon',
      vlt: 'gui-package-manager-vlt-icon',
    }

    const runtimeKey = tools.find(tool => mockRuntimes[tool] ?? null)
    const packageManagerKey = tools.find(
      tool => mockPackageManagers[tool] ?? null,
    )

    return {
      runtime: runtimeKey ? mockRuntimes[runtimeKey] : null,
      packageManager:
        packageManagerKey ?
          mockPackageManagers[packageManagerKey]
        : null,
    }
  }),
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/filter-search.tsx', () => ({
  FilterSearch: 'gui-filter-search',
}))

vi.mock('@/components/data-table/table-filter-search.tsx', () => ({
  TableFilterSearch: 'gui-dashboard-table-filter-search',
}))

vi.mock('@/components/data-table/table-view-dropdown.tsx', () => ({
  TableViewDropdown: 'gui-dashboard-table-view-dropdown',
}))

vi.mock('@/components/dashboard-grid/dasboard-table.tsx', () => ({
  DashboardTable: 'gui-dashboard-table',
}))

vi.mock('@/components/sort-dropdown.tsx', () => ({
  SortDropdown: 'gui-sort-dropdown',
}))

vi.mock(
  '@/components/dashboard-grid/dashboard-view-toggle.tsx',
  () => ({
    DashboardViewToggle: 'gui-dashboard-view-toggle',
  }),
)

vi.mock('lucide-react', () => ({
  Plus: 'gui-plus-icon',
  Settings2: 'gui-settings-icon',
}))

vi.mock('@/components/dashboard-grid/dashboard-item.tsx', () => ({
  DashboardItem: 'gui-dashboard-item',
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

test('dashboard-grid render default', async () => {
  render(<DashboardGrid />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('dashboard-grid with results', async () => {
  const Container = () => {
    const updateDashboard = useStore(state => state.updateDashboard)
    updateDashboard({
      cwd: '/path/to/cwd',
      defaultAuthor: 'John Doe',
      dashboardProjectLocations: [
        { path: '/home/user', readablePath: '~' },
      ],
      projects: [
        {
          name: 'project-foo',
          readablePath: '~/project-foo',
          path: '/home/user/project-foo',
          manifest: { name: 'project-foo', version: '1.0.0' },
          tools: ['node', 'vlt'],
          mtime: 1730498483044,
        },
        {
          name: 'project-bar',
          readablePath: '~/project-foo',
          path: '/home/user/project-bar',
          manifest: { name: 'project-bar', version: '1.0.0' },
          tools: ['pnpm'],
          mtime: 1730498491029,
        },
      ],
    })
    return <DashboardGrid />
  }
  render(<Container />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('dashboard-grid when loading and no dashboard', async () => {
  ;(useDashboardRootCheck as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
    hasDashboard: false,
    isLoading: true,
    dashboardRoots: [],
  })
  render(<DashboardGrid />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})

test('dashboard-grid when dashboard present with empty roots', async () => {
  ;(useDashboardRootCheck as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
    hasDashboard: true,
    isLoading: false,
    dashboardRoots: [],
  })
  render(<DashboardGrid />)
  expect(window.document.body.innerHTML).toMatchSnapshot()
})
