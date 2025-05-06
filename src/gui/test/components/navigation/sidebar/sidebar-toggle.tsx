import { vi, expect, afterEach, test } from 'vitest'
import {
  render,
  cleanup,
  fireEvent,
  act,
} from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useSidebar } from '@/components/ui/sidebar.tsx'
import { SidebarToggle } from '@/components/navigation/sidebar/sidebar-toggle.tsx'

vi.mock('react-router', () => ({
  useLocation: vi.fn().mockReturnValue({
    pathname: '/',
  }),
  NavLink: 'gui-nav-link',
}))

vi.mock('@/components/ui/sidebar.tsx', () => ({
  SidebarMenuItem: 'gui-sidebar-menu-item',
  SidebarMenuButton: 'gui-sidebar-menu-button',
  SidebarMenuBadge: 'gui-sidebar-menu-badge',
  SidebarMenuSub: 'gui-sidebar-menu-sub',
  SidebarMenuSubItem: 'gui-sidebar-menu-sub-item',
  SidebarMenuSubButton: 'gui-sidebar-menu-sub-button',
  useSidebar: vi.fn(),
}))

vi.mock('@/components/ui/collapsible.tsx', () => ({
  Collapsible: 'gui-collapsible',
  CollapsibleTrigger: 'gui-collapsible-trigger',
  CollapsibleContent: 'gui-collapsible-content',
}))

vi.mock('lucide-react', () => ({
  ArrowUpRight: 'gui-arrow-up-right-icon',
  ChevronRight: 'gui-chevron-right-icon',
  PanelLeftOpen: 'gui-panel-left-open-icon',
  PanelLeftClose: 'gui-panel-left-close-icon',
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

test('SidebarToggle component toggles the state', async () => {
  const mockToggleSidebar = vi.fn()

  vi.mocked(useSidebar).mockImplementation(() => ({
    state: 'expanded',
    toggleSidebar: mockToggleSidebar,
    hoveredItem: null,
    setHoveredItem: vi.fn(),
    open: true,
    setOpen: vi.fn(),
    openMobile: false,
    setOpenMobile: vi.fn(),
    isMobile: false,
  }))

  const { container } = render(<SidebarToggle />)

  const button = container.querySelector('button')
  if (!button) throw new Error('Button not found')

  await act(async () => {
    fireEvent.click(button)
  })

  expect(mockToggleSidebar).toHaveBeenCalledTimes(1)
})

test('SidebarToggle shows correct icon based on state', async () => {
  const mockToggleSidebar = vi.fn()

  // Test expanded state
  vi.mocked(useSidebar).mockImplementation(() => ({
    state: 'expanded',
    toggleSidebar: mockToggleSidebar,
    hoveredItem: null,
    setHoveredItem: vi.fn(),
    open: true,
    setOpen: vi.fn(),
    openMobile: false,
    setOpenMobile: vi.fn(),
    isMobile: false,
  }))

  const { container: expandedContainer } = render(<SidebarToggle />)
  expect(
    expandedContainer.querySelector('gui-panel-left-close-icon'),
  ).toBeTruthy()

  // Test collapsed state
  vi.mocked(useSidebar).mockImplementation(() => ({
    state: 'collapsed',
    toggleSidebar: mockToggleSidebar,
    hoveredItem: null,
    setHoveredItem: vi.fn(),
    open: false,
    setOpen: vi.fn(),
    openMobile: false,
    setOpenMobile: vi.fn(),
    isMobile: false,
  }))

  const { container: collapsedContainer } = render(<SidebarToggle />)
  expect(
    collapsedContainer.querySelector('gui-panel-left-open-icon'),
  ).toBeTruthy()
})
