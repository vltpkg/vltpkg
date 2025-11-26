import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Footer } from '@/components/navigation/footer/index.tsx'

vi.mock('react-router', () => ({
  Link: 'gui-link',
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: 'gui-motion-div',
  },
  useReducedMotion: vi.fn(() => false),
}))

vi.mock('lucide-react', () => ({
  ExternalLink: 'gui-external-link-icon',
}))

vi.mock('@/components/icons', () => ({
  Vlt: 'gui-vlt-icon',
}))

vi.mock('@/components/ui/scramble-hover', () => ({
  default: 'gui-scramble-hover',
}))

vi.mock('@/components/ui/theme-switcher', () => ({
  ThemeSwitcher: 'gui-theme-switcher',
}))

vi.mock('@/components/navigation/footer/data', () => ({
  footerLinkGroups: [
    {
      label: 'Products',
      links: [
        {
          title: 'Client',
          href: 'https://www.vlt.sh/products/client',
        },
      ],
    },
    {
      label: 'Resources',
      links: [
        { title: 'Documentation', href: 'https://docs.vlt.sh' },
      ],
    },
  ],
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('renders footer', () => {
  const { container } = render(<Footer />)
  expect(container.innerHTML).toMatchSnapshot()
})
