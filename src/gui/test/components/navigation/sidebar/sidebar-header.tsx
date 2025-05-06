import { vi, expect, afterEach, test } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { SidebarHeader } from '@/components/navigation/sidebar/sidebar-header.tsx'

vi.mock('@/components/icons/index.ts', () => ({
  Vlt: 'gui-vlt-icon',
}))

vi.mock('@/components/ui/sidebar.tsx', () => ({
  SidebarMenu: 'gui-sidebar-menu',
  SidebarMenuItem: 'gui-sidebar-menu-item',
  SidebarMenuButton: 'gui-sidebar-menu-button',
  SidebarHeader: 'gui-sidebar-header-primitive',
}))

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
  const Container = () => {
    return <SidebarHeader />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
