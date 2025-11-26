import { vi, test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { Header } from '@/components/navigation/header/index.tsx'
import { useLocation } from 'react-router'
import type { Location } from 'react-router'

vi.mock('react-router', () => ({
  useLocation: vi.fn().mockReturnValue({
    pathname: '/',
  } as Location),
  NavLink: 'gui-router-nav-link',
}))

vi.mock('@/components/icons/index.ts', () => ({
  Vlt: 'gui-vlt-icon',
  VltClient: 'gui-vlt-client-icon',
  Vsr: 'gui-vsr-icon',
}))

vi.mock('@/components/navigation/header/explorer.tsx', () => ({
  ExplorerHeader: 'gui-explorer-header',
}))

vi.mock('@/components/navigation/header/dashboard.tsx', () => ({
  DashboardHeader: 'gui-dashboard-header',
}))

vi.mock('@/components/navigation/header/queries.tsx', () => ({
  QueriesHeader: 'gui-queries-header',
}))

vi.mock('@/components/navigation/header/labels.tsx', () => ({
  LabelsHeader: 'gui-labels-header',
}))

vi.mock('@/components/navigation/linear-menu/index.tsx', () => ({
  LinearMenu: 'gui-linear-menu',
}))

vi.mock(
  '@/components/navigation/header/breadcrumb-header.tsx',
  () => ({
    BreadcrumbHeader: 'gui-breadcrumb-header',
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

const testCases = [
  '/explore',
  '/',
  '/queries',
  '/labels',
  '/help',
  '/settings',
]

test.each(testCases)('renders Header for route %s', routeName => {
  vi.mocked(useLocation).mockReturnValue({
    pathname: routeName,
  } as Location)
  const { container } = render(<Header />)

  expect(container.innerHTML).toMatchSnapshot()
})
