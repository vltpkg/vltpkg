import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStore } from '@/state'
import { useEffect } from 'react'

const getPreferredColorScheme = (): 'light' | 'dark' =>
  window.matchMedia('(prefers-color-scheme: light)').matches ?
    'light'
  : 'dark'

const ThemeSelect = () => {
  const { theme, updateTheme } = useStore()

  const onThemeChange = (
    selectedTheme: 'auto' | 'light' | 'dark',
  ) => {
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

  return (
    <Select
      value={theme}
      onValueChange={value =>
        onThemeChange(value as 'auto' | 'light' | 'dark')
      }>
      <SelectTrigger className="w-fit">
        <SelectValue placeholder="Theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
      </SelectContent>
    </Select>
  )
}

export default ThemeSelect
