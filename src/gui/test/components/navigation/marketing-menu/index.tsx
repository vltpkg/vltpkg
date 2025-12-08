import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Header } from '@/components/navigation/marketing-menu/index.tsx'

vi.mock('react-router', () => ({
  NavLink: 'gui-nav-link',
  useLocation: vi.fn().mockReturnValue({
    pathname: '/',
  }),
}))

vi.mock('react-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-dom')>('react-dom')
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  }
})

vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))

vi.mock('@/components/hooks/use-scroll.tsx', () => ({
  useScroll: vi.fn(() => false),
}))

vi.mock('@/components/navigation/marketing-menu/data.ts', () => ({
  menuContent: [
    {
      group: 'Products',
      children: [
        {
          label: 'Client',
          subtitle: 'vlt',
          path: 'https://www.vlt.sh/client',
        },
      ],
    },
    { label: 'Docs', path: 'https://docs.vlt.sh/', target: '_blank' },
  ],
}))

vi.mock('@/components/ui/navigation-menu.tsx', () => ({
  NavigationMenu: 'gui-navigation-menu',
  NavigationMenuIndicator: 'gui-navigation-menu-indicator',
  NavigationMenuItem: 'gui-navigation-menu-item',
  NavigationMenuLink: 'gui-navigation-menu-link',
  NavigationMenuList: 'gui-navigation-menu-list',
  NavigationMenuTrigger: 'gui-navigation-menu-trigger',
  NavigationMenuViewport: 'gui-navigation-menu-viewport',
}))

vi.mock('@/components/navigation/marketing-menu/logo.tsx', () => ({
  Logo: 'gui-logo',
}))

vi.mock(
  '@/components/navigation/marketing-menu/menu-group-content.tsx',
  () => ({
    MenuGroupContent: 'gui-menu-group-content',
  }),
)

vi.mock(
  '@/components/navigation/marketing-menu/list-item.tsx',
  () => ({
    ListItem: 'gui-list-item',
  }),
)

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('renders header', () => {
  const { container } = render(<Header />)
  expect(container.innerHTML).toMatchSnapshot()
})
