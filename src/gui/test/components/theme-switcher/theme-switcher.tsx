import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  fireEvent,
  screen,
  cleanup,
  render,
} from '@testing-library/react'
import html from 'diffable-html'
import ThemeSwitcher from '@/components/theme-switcher/theme-switcher.jsx'
import * as ThemeProviderModule from '@/components/ui/theme-provider.jsx'

const setThemeMock = vi.fn()

vi.spyOn(ThemeProviderModule, 'useTheme').mockImplementation(() => ({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: setThemeMock,
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

describe('theme-switcher component', () => {
  it('renders all the controls', () => {
    const Container = () => {
      return <ThemeSwitcher />
    }

    const { container } = render(<Container />)

    expect(
      container.querySelector('[aria-label="system"]'),
    ).toBeDefined()
    expect(
      container.querySelector('[aria-label="light mode"]'),
    ).toBeDefined()
    expect(
      container.querySelector('[aria-label="dark mode"]'),
    ).toBeDefined()
  })

  it('calls the setTheme function when clicked', () => {
    render(<ThemeSwitcher />)

    const lightModeButton = screen.getByLabelText('light mode')
    fireEvent.click(lightModeButton)

    expect(setThemeMock).toHaveBeenCalledWith('light')

    const darkModeButton = screen.getByLabelText('dark mode')
    fireEvent.click(darkModeButton)

    expect(setThemeMock).toHaveBeenCalledWith('dark')

    const systemModeButton = screen.getByLabelText('system')
    fireEvent.click(systemModeButton)

    expect(setThemeMock).toHaveBeenCalledWith('system')
  })
})
