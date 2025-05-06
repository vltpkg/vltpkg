import { SidebarMenuLink } from '@/components/navigation/sidebar/sidebar-menu-link.tsx'
import type { MenuItem } from '@/components/navigation/sidebar/menu.ts'
import { LaptopMinimal, SunMedium, Moon } from 'lucide-react'
import { useTheme } from '@/components/ui/theme-provider.tsx'
import type { Theme } from '@/components/ui/theme-provider.tsx'

const SidebarThemeSwitcher = () => {
  const { theme, setTheme } = useTheme()

  const themes = ['system', 'light', 'dark']
  const themeIcons = {
    system: LaptopMinimal,
    light: SunMedium,
    dark: Moon,
  }
  const themeLabels = {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
  }

  const toggleTheme = () => {
    const nextTheme =
      themes[(themes.indexOf(theme) + 1) % themes.length]
    setTheme(nextTheme as Theme)
  }

  const themeItem: MenuItem = {
    title: themeLabels[theme],
    icon: themeIcons[theme],
    onClick: toggleTheme,
  }

  return <SidebarMenuLink items={[themeItem]} />
}

export { SidebarThemeSwitcher }
