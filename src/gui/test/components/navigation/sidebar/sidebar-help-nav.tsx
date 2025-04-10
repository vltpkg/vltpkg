import { vi, expect, afterEach, test } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { useViewSidebar } from '@/components/navigation/sidebar/use-view-sidebar.jsx'
import { SidebarHelpNav } from '@/components/navigation/sidebar/sidebar-help-nav.jsx'

vi.mock('@/components/ui/sidebar.jsx', () => ({
  SidebarGroup: 'gui-sidebar-group',
  SidebarGroupLabel: 'gui-sidebar-group-label',
  SidebarMenu: 'gui-sidebar-menu',
}))

vi.mock(
  '@/components/navigation/sidebar/sidebar-menu-link.jsx',
  () => ({
    SidebarMenuLink: 'gui-sidebar-menu-link',
  }),
)

vi.mock(
  '@/components/navigation/sidebar/use-view-sidebar.jsx',
  () => ({
    useViewSidebar: vi.fn(),
  }),
)

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

test('SidebarHelpNav render default', () => {
  vi.mocked(useViewSidebar).mockReturnValue({
    isOnHelpView: vi.fn().mockReturnValue(false),
    isOnExploreView: vi.fn().mockReturnValue(false),
  })

  const Container = () => {
    return <SidebarHelpNav />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toBe('')
})

test('SidebarHelpNav render help view', () => {
  vi.mocked(useViewSidebar).mockReturnValue({
    isOnHelpView: vi.fn().mockReturnValue(true),
    isOnExploreView: vi.fn().mockReturnValue(false),
  })

  const Container = () => {
    return <SidebarHelpNav />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
