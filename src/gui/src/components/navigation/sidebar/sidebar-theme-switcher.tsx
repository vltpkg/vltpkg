import {
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar.jsx'
import { LaptopMinimal, SunMedium, Moon } from 'lucide-react'
import { useTheme } from '@/components/ui/theme-provider.jsx'
import type { Theme } from '@/components/ui/theme-provider.jsx'

const SidebarThemeSwitcher = () => {
  const { theme, setTheme } = useTheme()

  const themes = ['system', 'light', 'dark']
  const themeIcons = {
    system: <LaptopMinimal />,
    light: <SunMedium />,
    dark: <Moon />,
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

  return (
    <SidebarMenuItem>
      <SidebarMenuButton role="button" onClick={toggleTheme}>
        {themeIcons[theme]}
        <span>{themeLabels[theme]}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export { SidebarThemeSwitcher }
