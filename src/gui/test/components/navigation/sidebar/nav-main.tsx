import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { SidebarMainNav } from '@/components/navigation/sidebar/nav-main.jsx'
import { useGraphStore as useStore } from '@/state/index.js'

vi.mock('@/components/ui/sidebar.jsx', () => ({
  SidebarMenuSub: 'gui-sidebar-menu-sub',
  SidebarMenu: 'gui-sidebar-menu',
  SidebarMenuButton: 'gui-sidebar-menu-button',
  SidebarMenuItem: 'gui-sidebar-menu-item',
}))

vi.mock('@/components/ui/collapsible.jsx', () => ({
  Collapsible: 'gui-collapsible',
  CollapsibleContent: 'gui-collapsible-content',
  CollapsibleTrigger: 'gui-collapsible-trigger',
}))

vi.mock('lucide-react', () => ({
  ChevronRight: 'gui-chevron-right-icon',
  LayoutDashboard: 'gui-layout-dashboard-icon',
  Library: 'gui-library-icon',
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

describe('AppSidebar main nav', () => {
  it('renders correctly', () => {
    const Container = () => {
      return <SidebarMainNav />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
