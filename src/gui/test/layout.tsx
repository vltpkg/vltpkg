import { Dashboard } from '@/app/dashboard.tsx'
import { Search } from '@/app/search/index.tsx'
import { createRoutesStub } from 'react-router'
import { afterEach, test, vi, expect } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import Layout from '@/layout.tsx'

vi.mock('react-router', async () => {
  const actual = await import('react-router')
  return {
    ...actual,
    Outlet: 'gui-router-outlet',
  }
})

vi.mock('@/components/navigation/header/index.tsx', () => ({
  Header: 'gui-nav-header',
}))
vi.mock('@/components/navigation/sidebar/index.tsx', () => ({
  AppSidebar: 'gui-app-sidebar',
  defaultOpen: true,
}))
vi.mock('@/components/ui/sidebar.tsx', () => ({
  SidebarProvider: 'gui-sidebar-provider',
  SidebarInset: 'gui-sidebar-inset',
}))
vi.mock('@/components/ui/toaster.tsx', () => ({
  Toaster: 'gui-toaster',
}))
vi.mock('@/components/hooks/use-preflight.tsx', () => ({
  usePreflight: vi.fn(),
}))
vi.mock('@/components/navigation/footer/index.tsx', () => ({
  Footer: 'gui-marketing-footer',
}))

vi.mock('@/components/navigation/marketing-menu/index.tsx', () => ({
  Header: 'gui-marketing-header',
}))

vi.mock('@/app/dashboard.tsx', () => ({
  Dashboard: 'gui-dashboard-layout',
}))
vi.mock('@/app/search/index.tsx', () => ({
  Search: 'gui-search-layout',
}))
vi.mock('nuqs/adapters/react-router/v7', () => ({
  NuqsAdapter: 'gui-nuqs-adapter',
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

test('renders default components', () => {
  const Stub = createRoutesStub([
    {
      path: '/',
      Component: Layout,
      children: [
        {
          path: 'dashboard',
          Component: Dashboard,
        },
      ],
    },
  ])

  const { container } = render(
    <Stub initialEntries={['/dashboard']} />,
  )
  expect(container.innerHTML).toMatchSnapshot()
})

test("renders the marketing components on '/' route", () => {
  const Stub = createRoutesStub([
    {
      path: '/',
      Component: Layout,
      children: [
        {
          index: true,
          Component: Search,
        },
      ],
    },
  ])

  const { container } = render(<Stub initialEntries={['/']} />)
  expect(container.innerHTML).toMatchSnapshot()
})
