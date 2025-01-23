import { vi, expect, afterEach, describe, it } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { AppSidebar } from '@/components/navigation/sidebar/index.jsx'
import { useGraphStore as useStore } from '@/state/index.js'

vi.mock('@/components/ui/sidebar.jsx', () => ({
  Sidebar: 'gui-sidebar',
  SidebarContent: 'gui-sidebar-content',
  SidebarFooter: 'gui-sidebar-footer',
  SidebarGroup: 'gui-sidebar-group',
  SidebarHeader: 'gui-sidebar-header',
  SidebarRail: 'gui-sidebar-rail',
}))

vi.mock('@/components/navigation/sidebar/nav-main.jsx', () => ({
  SidebarMainNav: 'gui-sidebar-main-nav',
}))

vi.mock('@/components/navigation/sidebar/logo.jsx', () => ({
  SidebarLogo: 'gui-sidebar-logo',
}))

vi.mock('@/components/navigation/sidebar/nav-queries.jsx', () => ({
  SidebarQueryNav: 'gui-sidebar-query-nav',
}))

vi.mock(
  '@/components/navigation/sidebar/nav-project-queries.jsx',
  () => ({
    SidebarQueryProjectNav: 'gui-sidebar-query-project-nav',
  }),
)

vi.mock('@/components/navigation/sidebar/footer.jsx', () => ({
  AppSidebarFooter: 'gui-sidebar-footer',
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

describe('AppSidebar', () => {
  it('renders correctly', () => {
    const Container = () => {
      return <AppSidebar />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
