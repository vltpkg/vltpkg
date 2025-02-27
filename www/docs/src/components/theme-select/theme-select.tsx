import { useEffect, useState } from 'react'
import { SunMedium, Moon, LaptopMinimal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

type Theme = 'system' | 'light' | 'dark'

interface Control {
  ariaLabel: string
  icon: LucideIcon
  name: Theme
}

const ThemeSwitcher = () => {
  const [themeState, setThemeState] = useState<Theme>(() => {
    const theme = (localStorage.getItem('theme') ?? 'system') as Theme
    return theme
  })

  useEffect(() => {
    const applyTheme = (theme: Theme) => {
      let resolvedTheme = theme
      if (theme === 'system') {
        resolvedTheme =
          window.matchMedia('(prefers-color-scheme: dark)').matches ?
            'dark'
          : 'light'
      }

      /** data-theme is the resolved theme utilized by tailwind */
      document.documentElement.setAttribute(
        'data-theme',
        resolvedTheme,
      )

      /** data-theme-preference is the users preference */
      document.documentElement.setAttribute(
        'data-theme-preference',
        theme,
      )
    }

    applyTheme(themeState)
  }, [themeState])

  const controls: Control[] = [
    {
      ariaLabel: 'system',
      icon: LaptopMinimal,
      name: 'system',
    },
    {
      ariaLabel: 'light mode',
      icon: SunMedium,
      name: 'light',
    },
    {
      ariaLabel: 'dark mode',
      icon: Moon,
      name: 'dark',
    },
  ]

  const onThemeChange = (theme: Theme) => {
    setThemeState(theme)
    localStorage.setItem('theme', theme)
  }

  return (
    <div className="flex h-[38px] w-[114px] flex-row items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-800">
      {controls.map((control, idx) => (
        <div
          role="switch"
          key={idx}
          aria-label={control.ariaLabel}
          onClick={() => onThemeChange(control.name)}
          className={clsx(
            'z-[10] flex aspect-square h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full',
            {
              'border border-neutral-300 dark:border-neutral-800':
                themeState === control.name,
            },
          )}>
          <control.icon
            size={20}
            className={clsx('text-muted-foreground', {
              'text-black dark:text-white':
                themeState === control.name,
            })}
          />
        </div>
      ))}
    </div>
  )
}

export default ThemeSwitcher
