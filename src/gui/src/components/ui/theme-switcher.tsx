import { forwardRef } from 'react'
import { useTheme } from '@/components/ui/theme-provider.tsx'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import { Button } from '@/components/ui/button.tsx'
import { LaptopMinimal, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils.ts'

import type { Theme } from '@/components/ui/theme-provider.tsx'
import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

interface ThemeOption {
  theme: Theme
  icon: LucideIcon
  label: string
}

const themeOptions: ThemeOption[] = [
  {
    theme: 'system',
    icon: LaptopMinimal,
    label: 'System',
  },
  {
    theme: 'light',
    icon: Sun,
    label: 'Light',
  },
  {
    theme: 'dark',
    icon: Moon,
    label: 'Dark',
  },
]

const renderIcon = (theme: Theme): LucideIcon => {
  switch (theme) {
    case 'system':
      return LaptopMinimal
    case 'dark':
      return Moon
    case 'light':
      return Sun
    default:
      return LaptopMinimal
  }
}

export const ThemeSwitcher = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof Button>
>(({ className, ...rest }, ref) => {
  const { theme, setTheme } = useTheme()

  const updateTheme = (theme: Theme) => {
    setTheme(theme)
  }

  const Icon = renderIcon(theme)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={ref}
          size="sm"
          variant="ghost"
          className={cn(
            'group/trigger h-8 w-[100px] rounded-xl text-muted-foreground hover:text-foreground',
            'data-[state=open]:text-foreground',
            'dark:data-[state=open]:border-neutral-800 dark:data-[state=open]:bg-neutral-900',
            'data-[state=open]:border-neutral-200 data-[state=open]:bg-neutral-100',
            className,
          )}
          {...rest}>
          <Icon
            className={cn(
              'fill-neutral-500 stroke-neutral-500 transition-colors duration-100',
              'group-hover/trigger:fill-foreground group-hover/trigger:stroke-foreground',
              'group-data-[state=open]/trigger:fill-foreground group-data-[state=open]/trigger:stroke-foreground',
            )}
          />
          <p className="capitalize">{theme}</p>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="end"
        onCloseAutoFocus={e => e.preventDefault()}
        className="rounded-2xl">
        {themeOptions.map((o, idx) => (
          <DropdownMenuItem
            key={`${o.theme}-${idx}`}
            onClick={() => updateTheme(o.theme)}
            className="group/option h-8 rounded-xl text-muted-foreground hover:text-foreground">
            <o.icon
              className={cn(
                'fill-neutral-500 stroke-neutral-500 transition-colors duration-100',
                'group-hover/option:fill-foreground group-hover/option:stroke-foreground',
              )}
            />
            <p>{o.label}</p>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

ThemeSwitcher.displayName = 'ThemeSwitcher'
