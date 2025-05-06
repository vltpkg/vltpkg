import { assert } from '@/lib/utils.ts'
import { useGraphStore } from '@/state/index.ts'
import type { State } from '@/state/types.ts'
import { createContext, useContext, useEffect, useState } from 'react'

/** The possible states of theme */
export type Theme = 'dark' | 'light' | 'system'

/** What the `theme` will eventually resolve to */
export type ResolvedTheme = 'dark' | 'light'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  resolvedTheme: 'dark',
  setTheme: () => null,
}

const ThemeProviderContext =
  createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) ?? defaultTheme) as Theme,
  )
  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedTheme>('dark')
  const updateTheme = useGraphStore(state => state.updateTheme)

  useEffect(() => {
    const getPreferredColorScheme = (): ResolvedTheme =>
      window.matchMedia('(prefers-color-scheme: dark)').matches ?
        'dark'
      : 'light'

    const resolvedTheme = (): 'dark' | 'light' => {
      if (theme === 'system') {
        return getPreferredColorScheme()
      }
      return theme
    }

    const resolved = resolvedTheme()
    setResolvedTheme(resolved)

    const root = window.document.documentElement

    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme =
        window.matchMedia('(prefers-color-scheme: dark)').matches ?
          'dark'
        : 'light'

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    resolvedTheme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
      updateTheme(theme as State['theme'])
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  assert(context, 'useTheme must be used within a ThemeProvider')
  return context
}
