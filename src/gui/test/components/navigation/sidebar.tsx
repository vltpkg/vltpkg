import { expect, afterEach, vi, describe, it } from 'vitest'
import html from 'diffable-html'
import {
  act,
  render,
  screen,
  cleanup,
  fireEvent,
} from '@testing-library/react'
import { useGraphStore as useStore } from '@/state/index.js'
import { Sidebar } from '@/components/navigation/sidebar.jsx'
import { SidebarLock } from '@/components/navigation/sidebar.jsx'

vi.mock('lucide-react', () => ({
  LayoutDashboard: 'gui-lucide-layout-dashboard',
  ChevronRight: 'gui-lucide-chevron-right',
  Folder: 'gui-lucide-folder',
  FolderOpen: 'gui-lucide-folder-open',
  Library: 'gui-lucide-library',
  Menu: 'gui-lucide-menu',
  IconX: 'gui-lucide-icon-x',
  PanelLeft: 'gui-lucide-panel-left',
}))

vi.mock('@/components/ui/tooltip.jsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipContent: 'gui-tooltip-content',
  TooltipTrigger: 'gui-tooltip-trigger',
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

describe('Render the sidebar', () => {
  it('should render the sidebar on mobile', () => {
    const Container = () => {
      act(() => {
        global.innerWidth = 320
        global.innerHeight = 640
        global.dispatchEvent(new Event('resize'))
      })
      return <Sidebar />
    }
    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('should render the sidebar on desktop', () => {
    const Container = () => {
      act(() => {
        global.innerWidth = 1024
        global.innerHeight = 768
        global.dispatchEvent(new Event('resize'))
      })
      return <Sidebar />
    }
    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('should render the pinned projects', () => {
    const Container = () => {
      const updateProjects = useStore(
        state => state.updateSavedProjects,
      )
      updateProjects([
        {
          name: 'project-foo',
          path: '/home/user/project-foo',
          manifest: { name: 'project-foo', version: '1.0.0' },
          tools: ['node', 'vlt'],
          mtime: 1730498483044,
        },
        {
          name: 'project-bar',
          path: '/home/user/project-bar',
          manifest: { name: 'project-bar', version: '1.0.0' },
          tools: ['pnpm'],
          mtime: 1730498491029,
        },
      ])
      return <Sidebar />
    }
    const { container } = render(<Container />)
    expect(screen.getByText('project-foo')).toBeDefined()
    expect(screen.getByText('project-bar')).toBeDefined()
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('should be collapasible', async () => {
    const Container = () => {
      const sidebarState = useStore(state => state.lockSidebar)
      const updateSidebar = useStore(state => state.updateLockSidebar)
      return (
        <SidebarLock
          sidebarState={sidebarState}
          updateSidebar={updateSidebar}
        />
      )
    }
    const { container, getByRole } = render(<Container />)
    const lockButton = getByRole('button')
    fireEvent.click(lockButton)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
