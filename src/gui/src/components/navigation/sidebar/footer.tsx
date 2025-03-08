import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
  SidebarFooter,
} from '@/components/ui/sidebar.jsx'
import {
  LaptopMinimal,
  SunMedium,
  Moon,
  Library,
  ArrowUpRight,
} from 'lucide-react'
import { useTheme } from '@/components/ui/theme-provider.jsx'
import type { Theme } from '@/components/ui/theme-provider.jsx'

const AppSidebarFooter = () => {
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
    <SidebarFooter className="mb-[14px]">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <a
              href="https://docs.vlt.sh"
              target="_blank"
              className="duration-250 group/footer-button cursor-default text-muted-foreground transition-all">
              <Library />
              <span>Documentation</span>
              <ArrowUpRight className="duration-250 ml-auto transition-all group-hover/footer-button:-translate-y-0.5 group-hover/footer-button:translate-x-0.5" />
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={toggleTheme}>
            {themeIcons[theme]}
            <span>{themeLabels[theme]}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}

export { AppSidebarFooter }
