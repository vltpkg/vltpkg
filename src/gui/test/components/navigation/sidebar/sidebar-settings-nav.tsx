import { vi, expect, afterEach, test } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { SidebarSettingsNav } from '@/components/navigation/sidebar/sidebar-settings-nav.tsx'
import { useViewSidebar } from '@/components/navigation/sidebar/use-view-sidebar.tsx'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('lucide-react', async () => {
  const actual = await import('lucide-react')
  return {
    ...actual,
    Undo2: 'gui-undo-icon',
    Settings2: 'gui-settings-icon',
  }
})

vi.mock('@/components/ui/sidebar.tsx', () => ({
  SidebarGroup: 'gui-sidebar-group',
  SidebarMenu: 'gui-sidebar-menu',
}))

vi.mock(
  '@/components/navigation/sidebar/sidebar-menu-link.tsx',
  () => ({
    SidebarMenuLink: 'gui-sidebar-menu-link',
  }),
)

vi.mock(
  '@/components/navigation/sidebar/use-view-sidebar.tsx',
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

test('SidebarSettingsNav renders on "/settings" route', () => {
  vi.mocked(useViewSidebar).mockReturnValue({
    isOnHelpView: vi.fn().mockReturnValue(false),
    isOnSettingsView: vi.fn().mockReturnValue(true),
    isOnExploreView: vi.fn().mockReturnValue(false),
  })

  const Container = () => {
    return <SidebarSettingsNav />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SidebarSettingsNav does not render on other routes', () => {
  vi.mocked(useViewSidebar).mockReturnValue({
    isOnHelpView: vi.fn().mockReturnValue(false),
    isOnSettingsView: vi.fn().mockReturnValue(false),
    isOnExploreView: vi.fn().mockReturnValue(false),
  })

  const Container = () => {
    return <SidebarSettingsNav />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
