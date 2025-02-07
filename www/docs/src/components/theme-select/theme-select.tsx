import { useEffect } from 'react'
import { useStore } from '@/state'
import { type State } from '@/state/types'
import {
  SunMedium,
  Moon,
  LaptopMinimal,
  type LucideIcon,
} from 'lucide-react'
import clsx from 'clsx'

interface Control {
  ariaLabel: string
  icon: LucideIcon
  name: State['theme']
}

const ThemeSwitcher = () => {
  const { theme, getPreferredColorScheme, updateTheme } = useStore()

  const onThemeChange = (selectedTheme: State['theme']) => {
    const effectiveTheme =
      selectedTheme === 'auto' ?
        getPreferredColorScheme()
      : selectedTheme
    document.documentElement.dataset.theme = effectiveTheme
    updateTheme(selectedTheme)
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      '(prefers-color-scheme: light)',
    )
    const handleChange = () => {
      if (theme === 'auto') {
        onThemeChange('auto')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  useEffect(() => {
    onThemeChange(theme)
  }, [theme])

  const controls: Control[] = [
    {
      ariaLabel: 'system',
      icon: LaptopMinimal,
      name: 'auto',
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
                theme === control.name,
            },
          )}>
          <control.icon
            size={20}
            className={clsx('text-muted-foreground', {
              'text-black dark:text-white': theme === control.name,
            })}
          />
        </div>
      ))}
    </div>
  )
}

export default ThemeSwitcher
