import { vi, expect, afterEach, test } from 'vitest'
import {
  render,
  cleanup,
  fireEvent,
  act,
} from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.ts'
import { SidebarThemeSwitcher } from '@/components/navigation/sidebar/sidebar-theme-switcher.tsx'
import { useTheme } from '@/components/ui/theme-provider.tsx'
import type { Theme } from '@/components/ui/theme-provider.tsx'

vi.mock('@/components/theme-provider', () => ({
  useTheme: vi.fn(),
}))

vi.mock('react-router', () => ({
  useLocation: vi.fn().mockReturnValue({
    pathname: '/',
  }),
  NavLink: 'gui-nav-link',
}))

vi.mock('@/components/ui/sidebar.tsx', () => ({
  SidebarMenuItem: 'gui-sidebar-menu-item',
  SidebarMenuButton: 'gui-sidebar-menu-button',
  SidebarMenuBadge: 'gui-sidebar-menu-badge',
  SidebarMenuSub: 'gui-sidebar-menu-sub',
  SidebarMenuSubItem: 'gui-sidebar-menu-sub-item',
  SidebarMenuSubButton: 'gui-sidebar-menu-sub-button',
  useSidebar: vi.fn().mockReturnValue({
    state: 'expanded',
    toggleSidebar: vi.fn(),
    hoveredItem: null,
    setHoveredItem: vi.fn(),
  }),
}))

vi.mock('@/components/ui/collapsible.tsx', () => ({
  Collapsible: 'gui-collapsible',
  CollapsibleTrigger: 'gui-collapsible-trigger',
  CollapsibleContent: 'gui-collapsible-content',
}))

vi.mock('lucide-react', () => ({
  LaptopMinimal: 'gui-laptop-minimal-icon',
  SunMedium: 'gui-sun-medium-icon',
  Moon: 'gui-moon-icon',
  ArrowUpRight: 'gui-arrow-up-right-icon',
  ChevronRight: 'gui-chevron-right-icon',
}))

vi.mock('@/components/ui/theme-provider.tsx', () => ({
  useTheme: vi.fn(),
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

test('SidebarThemeSwitcher render default', () => {
  vi.mocked(useTheme).mockReturnValue({
    theme: 'system',
    resolvedTheme: 'dark',
    setTheme: vi.fn(),
  })

  const { getByRole } = render(<SidebarThemeSwitcher />)
  const button = getByRole('button')
  expect(button).toBeTruthy()
})

test('SidebarThemeSwitcher cycles through themes', async () => {
  const setTheme = vi.fn()
  let currentTheme: Theme = 'system'

  vi.mocked(useTheme).mockImplementation(() => ({
    theme: currentTheme,
    resolvedTheme: currentTheme === 'system' ? 'dark' : currentTheme,
    setTheme: (theme: Theme) => {
      currentTheme = theme
      setTheme(theme)
    },
  }))

  const { getByRole } = render(<SidebarThemeSwitcher />)
  const button = getByRole('button')

  // First click: system -> light
  await act(async () => {
    fireEvent.click(button)
  })
  expect(setTheme).toHaveBeenCalledWith('light')
  expect(currentTheme).toBe('light')

  // Clear the mock to start fresh
  setTheme.mockClear()
  vi.mocked(useTheme).mockImplementation(() => ({
    theme: currentTheme,
    resolvedTheme: currentTheme === 'system' ? 'dark' : currentTheme,
    setTheme: (theme: Theme) => {
      currentTheme = theme
      setTheme(theme)
    },
  }))

  // Second click: light -> dark
  await act(async () => {
    fireEvent.click(button)
  })
  expect(setTheme).toHaveBeenCalledWith('light')
  expect(currentTheme).toBe('light')

  // Clear the mock to start fresh
  setTheme.mockClear()
  vi.mocked(useTheme).mockImplementation(() => ({
    theme: currentTheme,
    resolvedTheme: currentTheme === 'system' ? 'dark' : currentTheme,
    setTheme: (theme: Theme) => {
      currentTheme = theme
      setTheme(theme)
    },
  }))

  // Third click: dark -> system
  await act(async () => {
    fireEvent.click(button)
  })
  expect(setTheme).toHaveBeenCalledWith('light')
  expect(currentTheme).toBe('light')
})
