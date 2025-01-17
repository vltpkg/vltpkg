import { vi, expect, afterEach, describe, it } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { SidebarLogo } from '@/components/navigation/sidebar/logo.jsx'

vi.mock('@/components/ui/sidebar.jsx', () => ({
  SidebarMenu: 'gui-sidebar-menu',
  SidebarMenuButton: 'gui-sidebar-menu-button',
  SidebarMenuItem: 'gui-sidebar-menu-item',
}))

vi.mock('@/components/icons/vlt-v.jsx', () => ({
  VLTV: 'gui-vlt-icon',
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

describe('AppSidebar Logo', () => {
  it('renders correctly', () => {
    const Container = () => {
      return <SidebarLogo />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
