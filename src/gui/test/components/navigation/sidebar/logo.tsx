import { vi, expect, afterEach, describe, it } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { SidebarLogo } from '@/components/navigation/sidebar/logo.jsx'

const toggleSidebarMock = vi.fn()

vi.mock('@/components/ui/sidebar.jsx', () => ({
  SidebarMenu: 'gui-sidebar-menu',
  SidebarMenuButton: 'gui-sidebar-menu-button',
  SidebarMenuItem: 'gui-sidebar-menu-item',
  useSidebar: vi.fn(() => ({
    toggleSidebar: toggleSidebarMock,
  })),
}))

vi.mock('@/components/ui/tooltip.jsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipContent: 'gui-tooltip-content',
}))

vi.mock('@/components/icons/index.js', () => ({
  VLTV: 'gui-vlt-icon',
}))

vi.mock('lucide-react', () => ({
  PanelLeft: 'gui-panel-left-icon',
  Command: 'gui-command-icon',
}))

vi.mock('@/components/ui/button.jsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/ui/kbd.jsx', () => ({
  Kbd: 'gui-kbd',
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
