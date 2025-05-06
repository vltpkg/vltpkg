import { vi, expect, afterEach, test } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { SidebarMenuLink } from '@/components/navigation/sidebar/sidebar-menu-link.tsx'
import type { MenuItem } from '@/components/navigation/sidebar/menu.ts'
import { useLocation } from 'react-router'
import { useSidebar } from '@/components/ui/sidebar.tsx'

vi.mock('@/components/ui/sidebar.tsx', () => ({
  SidebarMenuItem: 'gui-sidebar-menu-item',
  SidebarMenuButton: 'gui-sidebar-menu-button',
  SidebarMenuBadge: 'gui-sidebar-menu-badge',
  SidebarMenuSub: 'gui-sidebar-menu-sub',
  SidebarMenuSubItem: 'gui-sidebar-menu-sub-item',
  SidebarMenuSubButton: 'gui-sidebar-menu-sub-button',
  useSidebar: vi.fn().mockReturnValue({
    state: 'expanded',
    open: true,
    setOpen: vi.fn(),
    openMobile: false,
    setOpenMobile: vi.fn(),
    isMobile: false,
    toggleSidebar: vi.fn(),
    hoveredItem: null,
    setHoveredItem: vi.fn(),
  }),
}))

vi.mock('@/components/ui/collapsible.tsx', () => ({
  Collapsible: 'gui-collapsible',
  CollapsibleContent: 'gui-collapsible-content',
  CollapsibleTrigger: 'gui-collapsible-trigger',
}))

vi.mock('react-router', () => ({
  useLocation: vi.fn().mockReturnValue({
    pathname: '/',
    state: null,
    key: '',
    search: '',
    hash: '',
  }),
  NavLink: 'gui-nav-link',
}))

vi.mock('lucide-react', () => ({
  ArrowUpRight: 'gui-arrow-up-right-icon',
  ChevronRight: 'gui-chevron-right-icon',
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

test('SidebarMenuLink renders basic menu item', () => {
  const items: MenuItem[] = [
    {
      title: 'Home',
      url: '/',
    },
  ]

  const Container = () => {
    return <SidebarMenuLink items={items} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SidebarMenuLink renders menu item with badge', () => {
  const items: MenuItem[] = [
    {
      title: 'Notifications',
      url: '/notifications',
      badge: '3',
    },
  ]

  const Container = () => {
    return <SidebarMenuLink items={items} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SidebarMenuLink renders external link', () => {
  const items: MenuItem[] = [
    {
      title: 'Documentation',
      url: 'https://docs.example.com',
      external: true,
    },
  ]

  const Container = () => {
    return <SidebarMenuLink items={items} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SidebarMenuLink handles collapsible menu items', () => {
  const items: MenuItem[] = [
    {
      title: 'Settings',
      items: [
        {
          title: 'Profile',
          url: '/settings/profile',
        },
        {
          title: 'Security',
          url: '/settings/security',
        },
      ],
    },
  ]

  const Container = () => {
    return <SidebarMenuLink items={items} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SidebarMenuLink handles nested menu items', () => {
  const items: MenuItem[] = [
    {
      title: 'Products',
      items: [
        {
          title: 'Overview',
          url: '/products',
        },
        {
          title: 'Categories',
          items: [
            {
              title: 'Electronics',
              url: '/products/electronics',
            },
            {
              title: 'Clothing',
              url: '/products/clothing',
            },
          ],
        },
      ],
    },
  ]

  const Container = () => {
    return <SidebarMenuLink items={items} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SidebarMenuLink handles active state', () => {
  vi.mocked(useLocation).mockReturnValue({
    pathname: '/settings/profile',
    state: null,
    key: '',
    search: '',
    hash: '',
  })

  const items: MenuItem[] = [
    {
      title: 'Settings',
      items: [
        {
          title: 'Profile',
          url: '/settings/profile',
        },
        {
          title: 'Security',
          url: '/settings/security',
        },
      ],
    },
  ]

  const Container = () => {
    return <SidebarMenuLink items={items} />
  }

  const { container } = render(<Container />)
  expect(container.innerHTML).toMatchSnapshot()
})

test('SidebarMenuLink handles hover state', () => {
  const setHoveredItem = vi.fn()
  vi.mocked(useSidebar).mockReturnValue({
    state: 'expanded',
    open: true,
    setOpen: vi.fn(),
    openMobile: false,
    setOpenMobile: vi.fn(),
    isMobile: false,
    toggleSidebar: vi.fn(),
    hoveredItem: 'Settings',
    setHoveredItem,
  })

  const items: MenuItem[] = [
    {
      title: 'Settings',
      url: '/settings',
    },
  ]

  const Container = () => {
    return <SidebarMenuLink items={items} />
  }

  const { getByText } = render(<Container />)
  const settingsButton = getByText('Settings')

  fireEvent.mouseEnter(settingsButton)
  expect(setHoveredItem).toHaveBeenCalledWith('Settings')

  fireEvent.mouseLeave(settingsButton)
  expect(setHoveredItem).toHaveBeenCalledWith(null)
})

test('SidebarMenuLink handles parent click callback', () => {
  const onParentClick = vi.fn()
  const items: MenuItem[] = [
    {
      title: 'Settings',
      url: '/settings',
    },
  ]

  const Container = () => {
    return (
      <SidebarMenuLink items={items} onParentClick={onParentClick} />
    )
  }

  const { getByText } = render(<Container />)
  const settingsButton = getByText('Settings')

  fireEvent.click(settingsButton)
  expect(onParentClick).toHaveBeenCalled()
})
