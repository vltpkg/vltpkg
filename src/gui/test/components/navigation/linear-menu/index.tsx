import { vi, test, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { LinearMenu } from '@/components/navigation/linear-menu/index.tsx'

vi.mock('@/components/ui/popover.tsx', () => ({
  Popover: 'gui-popover',
  PopoverContent: 'gui-popover-content',
  PopoverTrigger: 'gui-popover-trigger',
}))

vi.mock('lucide-react', () => ({
  LayoutDashboard: 'gui-layout-dashboard-icon',
  ChevronDown: 'gui-chevron-down',
  Smile: 'gui-smile-icon',
}))

vi.mock('@/components/icons/index.ts', () => ({
  VltClient: 'gui-vlt-client-icon',
  Vsr: 'gui-vsr-icon',
}))

vi.mock('@/components/navigation/linear-menu/data.ts', () => ({
  menuData: [
    {
      title: 'Item Group',
      children: [
        {
          title: 'Child 1',
          icon: () => 'gui-smile-icon',
          path: 'https://example.com/child1',
        },
        {
          title: 'Child 2',
          icon: () => 'gui-smile-icon',
          path: 'https://example.com/child1',
        },
      ],
    },
    {
      title: 'Item',
      icon: () => 'gui-smile-icon',
      path: 'https://example.com',
      target: '_blank',
    },
  ],
}))

vi.mock('@/components/auth/user-linear-menu.tsx', () => ({
  UserLinearMenu: 'gui-user-linear-menu',
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

test('LinearMenu renders default', () => {
  const Container = () => {
    return <LinearMenu />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})
