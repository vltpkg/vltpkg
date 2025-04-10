import { vi, expect, afterEach, test } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { SidebarHeader } from '@/components/navigation/sidebar/sidebar-header.jsx'
import { useViewSidebar } from '@/components/navigation/sidebar/use-view-sidebar.jsx'

vi.mock('@/components/icons/vlt-v.jsx', () => ({
  VLTV: 'gui-vltv-icon',
}))

vi.mock('@/components/ui/sidebar.jsx', () => ({
  SidebarMenu: 'gui-sidebar-menu',
  SidebarMenuItem: 'gui-sidebar-menu-item',
  SidebarMenuButton: 'gui-sidebar-menu-button',
  SidebarHeader: 'gui-sidebar-header-primitive',
  useSidebar: vi.fn().mockReturnValue({
    open: true,
    setOpen: vi.fn(),
  }),
}))

vi.mock(
  '@/components/navigation/sidebar/use-view-sidebar.jsx',
  () => ({
    useViewSidebar: vi.fn(),
  }),
)

vi.mock('lucide-react', () => ({
  ArrowLeft: 'gui-arrow-left-icon',
  PanelLeft: 'gui-panel-left-icon',
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

test('AppSidebar header render default', () => {
  vi.mocked(useViewSidebar).mockReturnValue({
    isOnHelpView: vi.fn().mockReturnValue(false),
    isOnExploreView: vi.fn().mockReturnValue(false),
  })

  const Container = () => {
    return <SidebarHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('AppSidebar header render help view', () => {
  vi.mocked(useViewSidebar).mockReturnValue({
    isOnHelpView: vi.fn().mockReturnValue(true),
    isOnExploreView: vi.fn().mockReturnValue(false),
  })
  const Container = () => {
    return <SidebarHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
