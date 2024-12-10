import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type Theme = 'auto' | 'dark' | 'light'

export const storageKey = 'starlight-theme'

const parseTheme = (theme: unknown): Theme =>
  theme === 'auto' || theme === 'dark' || theme === 'light' ?
    theme
  : 'auto'

export const loadTheme = (): Theme =>
  parseTheme(
    typeof localStorage !== 'undefined' &&
      localStorage.getItem(storageKey),
  )

function storeTheme(theme: Theme): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(
      storageKey,
      theme === 'light' || theme === 'dark' ? theme : '',
    )
  }
}

export const getPreferredColorScheme = (): Theme =>
  matchMedia('(prefers-color-scheme: light)').matches ? 'light' : (
    'dark'
  )

const onThemeChange = (theme: Theme): void => {
  document.documentElement.dataset.theme =
    theme === 'auto' ? getPreferredColorScheme() : theme
  storeTheme(theme)
}

const ThemeSelect = ({
  setCurrentTheme,
}: {
  setCurrentTheme: React.Dispatch<React.SetStateAction<Theme>>
}) => {
  const [currentTheme, setCurrentThemeLocal] =
    useState<Theme>(loadTheme)

  useEffect(() => {
    onThemeChange(currentTheme)
  }, [currentTheme])

  const handleSelectChange = (value: string) => {
    const theme = parseTheme(value)
    setCurrentThemeLocal(theme)
    setCurrentTheme(theme)
  }

  return (
    <Select value={currentTheme} onValueChange={handleSelectChange}>
      <SelectTrigger className="w-fit">
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
        <SelectItem value="auto">System</SelectItem>
      </SelectContent>
    </Select>
  )
}

export default ThemeSelect
