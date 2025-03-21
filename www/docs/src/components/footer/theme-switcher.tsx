import { useEffect, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import type { LucideProps } from 'lucide-react'
import { LaptopMinimal, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Theme = 'system' | 'light' | 'dark'

const DOMAIN =
  process.env.NODE_ENV === 'development' ? 'localhost' : '.vlt.sh'

const setThemeCookie = (theme: Theme, resolveTo: Theme) => {
  const CookieDate = new Date()
  CookieDate.setFullYear(CookieDate.getFullYear() + 10)
  document.cookie = `theme=${theme}+${resolveTo};expires=${CookieDate.toString()};path=/;domain=${DOMAIN};SameSite=lax`
}

const storeTheme = (
  theme: Theme,
  setTheme: (theme: Theme) => void,
) => {
  let resolveTo: Theme

  setTheme(theme)

  switch (theme) {
    case 'system':
      resolveTo =
        window.matchMedia('(prefers-color-scheme: dark)').matches ?
          'dark'
        : 'light'
      break
    case 'dark':
      resolveTo = 'dark'
      break
    case 'light':
      resolveTo = 'light'
      break
  }

  document.documentElement.setAttribute(
    'data-theme',
    resolveTo === 'dark' ? 'dark' : 'light',
  )

  setThemeCookie(theme, resolveTo)
}

const ThemeSwitcher = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const theme = document.cookie
      .split('; ')
      .find(row => row.startsWith('theme='))
      ?.split('=')[1]
      ?.split('+')[0] as Theme

    return theme
  })

  useEffect(() => {
    storeTheme(theme, setTheme)
  }, [])

  const themes: { ariaLabel: Theme; name: Theme }[] = [
    {
      ariaLabel: 'system',
      name: 'system',
    },
    {
      ariaLabel: 'light',
      name: 'light',
    },
    {
      ariaLabel: 'dark',
      name: 'dark',
    },
  ]

  const renderIcon = (): React.ReactNode => {
    const themeProps: LucideProps = {
      size: 16,
    }

    return (
      theme === 'system' ? <LaptopMinimal {...themeProps} />
      : theme === 'light' ? <Sun {...themeProps} />
      : <Moon {...themeProps} />
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="group">
        <button className="[&>svg]:duration-250 duration-250 inline-flex justify-center w-[90px] cursor-default items-center gap-2 rounded-md bg-transparent px-2 py-1 text-sm font-medium text-neutral-500 ring-offset-background transition-all hover:bg-neutral-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=open]:bg-neutral-200 data-[state=open]:text-foreground dark:hover:bg-secondary dark:data-[state=open]:bg-secondary [&>svg]:fill-neutral-500 [&>svg]:stroke-neutral-500 [&>svg]:transition-all [&>svg]:hover:fill-foreground [&>svg]:hover:stroke-foreground [&>svg]:data-[state=open]:fill-foreground [&>svg]:data-[state=open]:stroke-foreground">
          {renderIcon()}
          <span className='capitalize'>{theme}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="center"
        onCloseAutoFocus={(e: Event) => e.preventDefault()}>
        {themes.map(t => (
          <DropdownMenuItem
            onClick={() => {
              storeTheme(t.name, setTheme)
            }}
            className={cn(
              'relative text-sm font-medium capitalize',
              t.name === theme ?
                'bg-neutral-200/40 dark:bg-neutral-800/80'
              : '',
            )}
            key={t.name}>
            {t.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { ThemeSwitcher }
