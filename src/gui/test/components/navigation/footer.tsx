import { afterEach, it, describe, vi, expect } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { Footer } from '@/components/navigation/footer.jsx'

vi.mock('useTheme', () => ({
  useTheme: vi.fn(),
}))
vi.mock('useGraphStore', () => ({
  useGraphStore: vi.fn(),
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  const CleanUp = () => (useStore(state => state.reset)(), '')
  render(<CleanUp />)
  cleanup()
})

const socialLinks = ['linkedin', 'twitter-x', 'github', 'discord']

describe('Footer Component', () => {
  it('renders the social media links for light theme', () => {
    const Container = () => {
      const setTheme = useStore(state => state.updateTheme)
      setTheme('light')
      return <Footer />
    }
    const { container } = render(<Container />)

    const icons = container.getElementsByTagName('img')
    socialLinks.forEach((link, idx) => {
      const icon = icons[idx] as HTMLImageElement
      expect(icon).toBeDefined()
      expect(icon.src).toContain(`/icons/${link}.svg`)
      const iconStyle = window.getComputedStyle(icon)
      expect(iconStyle.filter).toBe('invert(1)')
    })

    expect(container.innerHTML).toMatchSnapshot()
  })

  it('renders the social media links for dark theme', () => {
    const Container = () => {
      const setTheme = useStore(state => state.updateTheme)
      setTheme('dark')
      return <Footer />
    }
    const { container } = render(<Container />)

    const icons = container.getElementsByTagName('img')
    socialLinks.forEach((link, idx) => {
      const icon = icons[idx] as HTMLImageElement
      expect(icon).toBeDefined()
      expect(icon.src).toContain(`/icons/${link}.svg`)
      const iconStyle = window.getComputedStyle(icon)
      expect(iconStyle.filter).toBe('invert(0)')
    })
    expect(container.innerHTML).toMatchSnapshot()
  })

  it('renders the copyright text', () => {
    const Container = () => {
      return <Footer />
    }

    const { container } = render(<Container />)

    const currentYear = new Date().getFullYear()
    const copyrightText = screen.getByText(
      `© ${currentYear} vlt technology inc.`,
    )
    expect(copyrightText).toBeDefined()
    expect(container.innerHTML).toMatchSnapshot()
  })
})
