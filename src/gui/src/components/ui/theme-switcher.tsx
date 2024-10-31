import { useRef, useEffect } from 'react'
import {
  type LucideIcon,
  Sun,
  Moon,
  LaptopMinimal,
} from 'lucide-react'
import { type Theme, useTheme } from './theme-provider.jsx'
import { Button } from '@/components/ui/button.jsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx'
import gsap from 'gsap'

interface Setting {
  mode: Theme
  ariaLabel: string
  icon: LucideIcon
}

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme()
  const tabRefs = useRef<HTMLDivElement[]>([])
  const sliderRef = useRef<HTMLDivElement>(null)

  const settings: Setting[] = [
    {
      mode: 'light',
      ariaLabel: 'Light mode',
      icon: Sun,
    },
    {
      mode: 'dark',
      ariaLabel: 'Dark mode',
      icon: Moon,
    },
    {
      mode: 'system',
      ariaLabel: 'System mode',
      icon: LaptopMinimal,
    },
  ]

  const handleSwitchAnimation = () => {
    const activeIdx = tabRefs.current.findIndex(
      tab => tab.getAttribute('data-theme') === theme,
    )

    if (activeIdx !== -1 && sliderRef.current) {
      const activeTab = tabRefs.current[activeIdx]
      if (activeTab) {
        const { offsetLeft, offsetHeight } = activeTab

        const bgColor =
          theme === 'dark' ? 'white'
          : theme === 'light' ? '#212121'
          : 'white'

        gsap.to(sliderRef.current, {
          x: offsetLeft,
          width: offsetHeight,
          borderRadius: `${offsetHeight / 2}px`,
          height: offsetHeight,
          backgroundColor: bgColor,
          ease: 'power2.inOut',
          duration: 0.3,
        })
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, mode: Theme) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setTheme(mode)
    }
  }

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        handleSwitchAnimation()
      }
    }

    window.addEventListener('resize', handleResize)

    handleSwitchAnimation()

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [theme])

  const getIconColor = (mode: Theme) => {
    if (theme === mode) {
      return (
        theme === 'dark' ? '#212121'
        : theme === 'light' ? 'white'
        : '#212121'
      )
    } else {
      return (
        theme === 'light' ? '#212121'
        : theme === 'dark' ? 'white'
        : 'white'
      )
    }
  }

  return (
    <>
      {/* large screens */}
      <div className="hidden sm:flex relative flex-row items-center h-12 justify-center border rounded-full gap-3 px-2 py-2">
        {/* Sliding background */}
        <div
          ref={sliderRef}
          className="absolute top-[4.5px] left-0 rounded-md shadow-md"
          style={{ width: 50 }}
        />

        {/* tabs */}
        {settings.map((setting, idx) => (
          <div
            key={setting.mode}
            ref={(el: HTMLDivElement) => {
              tabRefs.current[idx] = el
            }}
            className="relative cursor-pointer flex items-center justify-center p-2 offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            role="button"
            tabIndex={0}
            aria-pressed={theme === setting.mode}
            aria-label={setting.ariaLabel}
            onClick={() => setTheme(setting.mode)}
            onKeyDown={e => handleKeyDown(e, setting.mode)}
            data-theme={setting.mode}>
            <setting.icon
              color={getIconColor(setting.mode)}
              size={20}
            />
          </div>
        ))}
      </div>

      {/* small screens */}
      <div className="flex sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              {settings.map((setting, idx) => (
                <setting.icon
                  key={idx}
                  size={22}
                  className="transition-all"
                  color={
                    theme === setting.mode ?
                      theme === 'dark' ?
                        'white'
                      : theme === 'light' ?
                        '#212121'
                      : 'white'
                    : theme === 'light' ?
                      'white'
                    : theme === 'dark' ?
                      '#212121'
                    : '#212121'
                  }
                  style={{
                    display: theme === setting.mode ? 'flex' : 'none',
                  }}
                />
              ))}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {settings.map((setting, idx) => (
              <DropdownMenuItem
                key={idx}
                onClick={() => setTheme(setting.mode)}>
                {setting.mode}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
