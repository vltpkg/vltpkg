import { vi, expect, afterEach, test } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { AppSidebar } from '@/components/navigation/sidebar/index.jsx'

vi.mock('@/components/ui/sidebar.jsx', () => ({
  Sidebar: 'gui-sidebar',
  SidebarContent: 'gui-sidebar-content',
  SidebarMenu: 'gui-sidebar-menu',
  SidebarRail: 'gui-sidebar-rail',
  SidebarFooter: 'gui-sidebar-footer',
}))

vi.mock('@/components/navigation/sidebar/sidebar-header.jsx', () => ({
  SidebarHeader: 'gui-sidebar-header',
}))
vi.mock(
  '@/components/navigation/sidebar/sidebar-theme-switcher.jsx',
  () => ({
    SidebarThemeSwitcher: 'gui-sidebar-theme-switcher',
  }),
)
vi.mock(
  '@/components/navigation/sidebar/sidebar-menu-link.jsx',
  () => ({
    SidebarMenuLink: 'gui-sidebar-menu-link',
  }),
)
vi.mock('@/components/navigation/sidebar/sidebar-toggle.jsx', () => ({
  SidebarToggle: 'gui-sidebar-toggle',
}))

vi.mock(
  '@/components/navigation/sidebar/sidebar-main-nav.jsx',
  () => ({
    SidebarMainNav: 'gui-sidebar-main-nav',
  }),
)
vi.mock(
  '@/components/navigation/sidebar/sidebar-query-nav.jsx',
  () => ({
    SidebarQueryNav: 'gui-sidebar-query-nav',
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
})

test('AppSidebar renders with the correct structure', () => {
  const Container = () => {
    return <AppSidebar />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
