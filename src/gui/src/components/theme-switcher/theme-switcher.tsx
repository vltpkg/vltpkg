import {
  type Theme,
  useTheme,
} from '@/components/ui/theme-provider.jsx'
import {
  type LucideIcon,
  SunMedium,
  Moon,
  LaptopMinimal,
} from 'lucide-react'
import clsx from 'clsx'

interface Control {
  ariaLabel: string
  icon: LucideIcon
  name: Theme
}

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme()

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

  return (
    <div className="flex h-[38px] w-[114px] flex-row items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-800">
      {controls.map((control, idx) => (
        <div
          role="switch"
          key={idx}
          aria-label={control.ariaLabel}
          onClick={() => setTheme(control.name)}
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
