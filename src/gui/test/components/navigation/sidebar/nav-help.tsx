import { test, expect, afterEach, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { HelpNav } from '@/components/navigation/sidebar/nav-help.jsx'

vi.mock('react-router', () => ({
  useLocation: vi.fn().mockReturnValue({ pathname: '/help' }),
  NavLink: 'gui-nav-link',
}))

vi.mock('@/components/ui/sidebar.jsx', () => ({
  SidebarGroupLabel: 'gui-sidebar-group-label',
  SidebarMenu: 'gui-sidebar-menu',
  SidebarMenuButton: 'gui-sidebar-menu-button',
  SidebarMenuItem: 'gui-sidebar-menu-item',
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

test('AppSidebar help nav', () => {
  const Container = () => {
    return <HelpNav />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
