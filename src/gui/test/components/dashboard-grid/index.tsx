import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { DashboardGrid } from '@/components/dashboard-grid/index.tsx'
import type { DashboardTools } from '@/state/types.ts'

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

vi.mock('@/components/ui/card.tsx', () => ({
  CardTitle: 'gui-card-title',
}))

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipContent: 'gui-tooltip-content',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipTrigger: 'gui-tooltip-trigger',
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

vi.mock('date-fns', () => ({
  format: () => 'November 1st, 2024 | 06:01 PM',
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
