import { vi, test, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { DashboardItem } from '@/components/dashboard-grid/dashboard-item.tsx'
import type {
  DashboardTools,
  DashboardDataProject,
} from '@/state/types.ts'

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

vi.mock('@/components/ui/tooltip.tsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipContent: 'gui-tooltip-content',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipTrigger: 'gui-tooltip-trigger',
}))

vi.mock('date-fns', () => ({
  format: () => 'November 1st, 2024',
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

test('dashboard-item renders correctly', () => {
  const mockItem: DashboardDataProject = {
    name: 'project-foo',
    readablePath: '~/project-foo',
    path: '/home/user/project-foo',
    manifest: { name: 'project-foo', version: '1.0.0' },
    tools: ['node', 'vlt'],
    mtime: 1730498483044,
  }
  const mockOnClick = vi.fn()

  const Container = () => {
    return <DashboardItem item={mockItem} onItemClick={mockOnClick} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
