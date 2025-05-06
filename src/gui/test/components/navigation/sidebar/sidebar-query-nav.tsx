import { vi, expect, afterEach, test } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { useViewSidebar } from '@/components/navigation/sidebar/use-view-sidebar.tsx'
import { SidebarQueryNav } from '@/components/navigation/sidebar/sidebar-query-nav.tsx'
import type { SavedQuery, State } from '@/state/types.ts'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(),
}))

vi.mock('@/components/ui/sidebar.tsx', () => ({
  SidebarMenu: 'gui-sidebar-menu',
  SidebarGroup: 'gui-sidebar-group',
  SidebarSeparator: 'gui-sidebar-separator',
  SidebarGroupLabel: 'gui-sidebar-group-label',
  useSidebar: vi.fn().mockReturnValue({
    open: true,
    setOpen: vi.fn(),
  }),
}))

vi.mock(
  '@/components/navigation/sidebar/use-view-sidebar.tsx',
  () => ({
    useViewSidebar: vi.fn(),
  }),
)

vi.mock('@/components/queries/saved-item.tsx', () => ({
  selectQuery: vi.fn(),
}))

vi.mock(
  '@/components/navigation/sidebar/sidebar-menu-link.tsx',
  () => ({
    SidebarMenuLink: 'gui-sidebar-menu-link',
  }),
)

vi.mock('lucide-react', () => ({
  Folder: 'gui-folder-icon',
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

test('SidebarQueryNav render default', () => {
  vi.mocked(useViewSidebar).mockReturnValue({
    isOnHelpView: vi.fn().mockReturnValue(false),
    isOnExploreView: vi.fn().mockReturnValue(false),
  })

  const Container = () => {
    return <SidebarQueryNav />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toBe('')
})

test('SidebarQueryNav render with no saved queries', () => {
  vi.mocked(useViewSidebar).mockReturnValue({
    isOnHelpView: vi.fn().mockReturnValue(false),
    isOnExploreView: vi.fn().mockReturnValue(true),
  })

  const Container = () => {
    return <SidebarQueryNav />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toBe('')
})

test('SidebarQueryNav render with saved queries', () => {
  vi.mocked(useViewSidebar).mockReturnValue({
    isOnHelpView: vi.fn().mockReturnValue(false),
    isOnExploreView: vi.fn().mockReturnValue(true),
  })

  const mockGraph = {
    projectRoot: '~/foo/bar/baz',
  } as State['graph']

  const mockGlobalQuery = {
    id: '001',
    name: 'mock query 1',
    context: '',
  } as unknown as SavedQuery

  const mockProjectQuery = {
    id: '002',
    name: 'mock query 2',
    context: '~/foo/bar/baz',
  } as unknown as SavedQuery

  const Container = () => {
    const saveQuery = useStore(state => state.saveQuery)
    const updateGraph = useStore(state => state.updateGraph)
    saveQuery(mockGlobalQuery)
    saveQuery(mockProjectQuery)
    updateGraph(mockGraph)
    return <SidebarQueryNav />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
