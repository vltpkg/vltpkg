import { vi, expect, afterEach, test } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { SidebarMainNav } from '@/components/navigation/sidebar/sidebar-main-nav.tsx'

vi.mock(
  '@/components/navigation/sidebar/sidebar-menu-link.tsx',
  () => ({
    SidebarMenuLink: 'gui-sidebar-menu-link',
  }),
)

vi.mock('@/components/ui/sidebar.tsx', () => ({
  SidebarGroup: 'gui-sidebar-group',
  SidebarMenu: 'gui-sidebar-menu',
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

test('SidebarMainNav render default', () => {
  const Container = () => {
    return <SidebarMainNav />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
