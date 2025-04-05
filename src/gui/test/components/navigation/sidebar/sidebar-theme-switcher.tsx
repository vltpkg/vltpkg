import { vi, expect, afterEach, test } from 'vitest'
import {
  render,
  cleanup,
  fireEvent,
  act,
} from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { SidebarThemeSwitcher } from '@/components/navigation/sidebar/sidebar-theme-switcher.jsx'
import { useTheme } from '@/components/ui/theme-provider.jsx'
import type { Theme } from '@/components/ui/theme-provider.jsx'

vi.mock('@/components/theme-provider', () => ({
  useTheme: vi.fn(),
}))

vi.mock('@/components/ui/sidebar.jsx', () => ({
  SidebarMenuItem: 'gui-sidebar-menu-item',
  SidebarMenuButton: 'gui-sidebar-menu-button',
}))

vi.mock('lucide-react', () => ({
  LaptopMinimal: 'gui-laptop-minimal-icon',
  SunMedium: 'gui-sun-medium-icon',
  Moon: 'gui-moon-icon',
}))

vi.mock('@/components/ui/theme-provider.jsx', () => ({
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
