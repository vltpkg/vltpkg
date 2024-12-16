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
import * as ThemeProviderModule from '@/components/ui/theme-provider.jsx'

const setAnimateMock = vi.fn()
const setThemeMock = vi.fn()

vi.spyOn(ThemeProviderModule, 'useTheme').mockImplementation(() => ({
  theme: 'light',
  setTheme: setThemeMock,
}))

vi.mock('lucide-react', () => ({
  LayoutDashboard: 'gui-lucide-layout-dashboard',
  ArrowRightFromLine: 'gui-lucide-arrow-right-from-line',
  ArrowLeftFromLine: 'gui-lucide-arrow-left-from-line',
  ChevronRight: 'gui-lucide-chevron-right',
  Folder: 'gui-lucide-folder',
  FolderOpen: 'gui-lucide-folder-open',
  Library: 'gui-lucide-library',
  Sun: 'gui-lucide-sun',
  Moon: 'gui-lucide-moon',
  Menu: 'gui-lucide-menu',
  IconX: 'gui-lucide-icon-x',
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

  it('should change the theme', () => {
    const { container, getByRole } = render(<Sidebar.ThemeSwitcher />)

    const themeSwitcher = getByRole('button')
    fireEvent.click(themeSwitcher)

    expect(themeSwitcher).toBeDefined()
    expect(setThemeMock).toHaveBeenCalledWith('dark')
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('should be collapasible', () => {
    const Container = () => {
      return (
        <Sidebar.Lock animate={false} setAnimate={setAnimateMock} />
      )
    }
    const { container, getByRole } = render(<Container />)
    const lockButton = getByRole('button')
    fireEvent.click(lockButton)
    expect(setAnimateMock).toHaveBeenCalledWith(true)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
