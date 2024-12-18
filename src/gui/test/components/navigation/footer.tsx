import { vi, afterEach, it, describe, expect } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import html from 'diffable-html'
import { useGraphStore as useStore } from '@/state/index.js'
import { Footer } from '@/components/navigation/footer.jsx'

vi.mock('@/components/icons/index.js', () => ({
  Discord: 'gui-discord-icon',
  Linkedin: 'gui-linkedin-icon',
  Github: 'gui-github-icon',
  TwitterX: 'gui-twitter-icon',
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

describe('Footer Component', () => {
  it('renders all the social icons', () => {
    const socialMediaLinks = [
      {
        name: 'linkedin',
        url: 'https://www.linkedin.com/company/vltpkg/',
      },
      { name: 'twitter-x', url: 'https://x.com/vltpkg' },
      { name: 'github', url: 'https://github.com/vltpkg' },
      { name: 'discord', url: 'https://discord.gg/vltpkg' },
    ]

    render(<Footer />)

    socialMediaLinks.forEach(({ name, url }) => {
      const link = screen.getByLabelText(name)
      expect(link).toBeTruthy()
      expect(link.getAttribute('href')).toBe(url)
    })
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
