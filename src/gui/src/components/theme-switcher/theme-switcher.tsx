import { useTheme } from '@/components/ui/theme-provider.jsx'
import { SunMedium, Moon, LaptopMinimal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import type { Theme } from '@/components/ui/theme-provider.jsx'

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
    <div className="flex flex-row items-center justify-center w-[114px] h-[38px] border border-neutral-300 dark:border-neutral-800 rounded-full">
      {controls.map((control, idx) => (
        <div
          role="switch"
          key={idx}
          aria-label={control.ariaLabel}
          onClick={() => setTheme(control.name)}
          className={clsx(
            'cursor-pointer flex items-center justify-center rounded-full aspect-square h-[38px] w-[38px] z-[10]',
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