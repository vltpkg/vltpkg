import { vi, expect, afterEach, describe, it } from 'vitest'
import {
  fireEvent,
  screen,
  render,
  cleanup,
} from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { SidebarTrigger } from '@/components/navigation/sidebar/trigger.jsx'

vi.mock('@/components/ui/tooltip.jsx', () => ({
  Tooltip: 'gui-tooltip',
  TooltipProvider: 'gui-tooltip-provider',
  TooltipTrigger: 'gui-tooltip-trigger',
  TooltipContent: 'gui-tooltip-content',
}))

const toggleSidebarMock = vi.fn()

vi.mock('@/components/ui/sidebar.jsx', () => ({
  SidebarMenuButton: 'gui-sidebar-menu-button',
  useSidebar: vi.fn(() => ({
    toggleSidebar: toggleSidebarMock,
  })),
}))

vi.mock('lucide-react', () => ({
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

describe('AppSidebar Trigger', () => {
  it('renders correctly', () => {
    const Container = () => {
      return <SidebarTrigger />
    }

    const { container } = render(<Container />)
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('calls toggleSidebar when clicked', () => {
    render(<SidebarTrigger />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(toggleSidebarMock).toHaveBeenCalledTimes(1)
  })
})
