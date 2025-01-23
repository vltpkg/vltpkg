import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'

vi.mock('@/components/ui/sidebar.jsx', () => ({
  SidebarMenuSub: 'gui-sidebar-menu-sub',
  SidebarMenu: 'gui-sidebar-menu',
  SidebarMenuButton: 'gui-sidebar-menu-button',
  SidebarMenuItem: 'gui-sidebar-menu-item',
  SidebarGroup: 'gui-sidebar-group',
  SidebarSeparator: 'gui-sidebar-separator',
  SidebarMenuSubItem: 'gui-sidebar-menu-sub-item',
  SidebarMenuSubButton: 'gui-sidebar-menu-sub-button',
}))

vi.mock('@/components/ui/collapsible.jsx', () => ({
  Collapsible: 'gui-collapsible',
  CollapsibleContent: 'gui-collapsible-content',
  CollapsibleTrigger: 'gui-collapsible-trigger',
}))

vi.mock('lucide-react', () => ({
  ChevronRight: 'gui-chevron-right-icon',
  Sparkle: 'gui-sparkle-icon',
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
  it('renders correctly', () => {})
})
