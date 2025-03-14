import { afterEach, test, vi, expect } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import Layout from '@/layout.jsx'

vi.mock('react-router', () => ({
  Outlet: 'gui-router-outlet',
}))

vi.mock('@/components/navigation/header.jsx', () => ({
  Header: 'gui-nav-header',
}))
vi.mock('@/components/navigation/sidebar/index.jsx', () => ({
  AppSidebar: 'gui-app-sidebar',
  defaultOpen: true,
}))
vi.mock('@/components/ui/sidebar.jsx', () => ({
  SidebarProvider: 'gui-sidebar-provider',
  SidebarInset: 'gui-sidebar-inset',
}))
vi.mock('@/components/ui/toaster.jsx', () => ({
  Toaster: 'gui-toaster',
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

test('renders Layout with an outlet', () => {
  const { container } = render(<Layout />)
  expect(container.innerHTML).toMatchSnapshot()
})
