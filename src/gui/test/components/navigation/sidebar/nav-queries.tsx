import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { SidebarQueryNav } from '@/components/navigation/sidebar/nav-queries.jsx'
import { useGraphStore as useStore } from '@/state/index.js'

vi.mock('@/components/ui/sidebar.jsx', () => ({
  SidebarMenu: 'gui-sidebar-menu',
  SidebarMenuButton: 'gui-sidebar-menu-button',
  SidebarMenuItem: 'gui-sidebar-menu-item',
  SidebarMenuBadge: 'gui-sidebar-menu-badge',
}))

vi.mock('lucide-react', () => ({
  Star: 'gui-star-icon',
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

describe('AppSidebar query nav', () => {
  it('renders correctly', () => {
    const Container = () => {
      return <SidebarQueryNav />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
