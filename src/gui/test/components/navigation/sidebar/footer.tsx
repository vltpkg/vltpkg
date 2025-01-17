import { vi, describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { AppSidebarFooter } from '@/components/navigation/sidebar/footer.jsx'

vi.mock('@/components/ui/sidebar.jsx', () => ({
  SidebarMenuItem: 'gui-sidebar-menu-item',
  SidebarMenuButton: 'gui-sidebar-menu-button',
  SidebarMenu: 'gui-sidebar-menu',
  SidebarFooter: 'gui-sidebar-footer',
  SidebarSeparator: 'gui-sidebar-separator',
}))

vi.mock('lucide-react', () => ({
  Library: 'gui-library-icon',
  ArrowUpRight: 'gui-arrow-up-right-icon',
}))

vi.mock('@/components/navigation/sidebar/trigger.jsx', () => ({
  SidebarTrigger: 'gui-sidebar-trigger',
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

describe('AppSidebar project queries', () => {
  it('renders correctly', () => {
    const Container = () => {
      return <AppSidebarFooter />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
