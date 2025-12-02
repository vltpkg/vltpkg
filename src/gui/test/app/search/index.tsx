import { test, expect, vi, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import html from 'diffable-html'
import { Search } from '@/app/search/index.tsx'

import type { Post } from '@/lib/blog-posts'

vi.mock('react-router', () => ({
  Link: 'gui-router-link',
  NavLink: 'gui-router-nav-link',
}))
vi.mock('lucide-react', () => ({
  ChevronRight: 'gui-chevron-right-icon',
  ArrowRight: 'gui-arrow-right-icon',
}))
vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('November 24th, 2025'),
}))
vi.mock('@/components/search/search.tsx', () => ({
  Search: 'gui-search-palette',
}))
vi.mock('@/components/call-to-action/waitlist/grid.tsx', () => ({
  CtaWaitlistGrid: 'gui-cta-waitlist-grid',
}))
vi.mock('@/components/ui/button.tsx', () => ({
  Button: 'gui-button',
}))
vi.mock('@/components/icons/index.ts', () => ({
  VltClient: 'vlt-client-icon',
  Vsr: 'vlt-vsr-icon',
}))
vi.mock('@/components/ui/text-flip.tsx', () => ({
  FlipWords: 'gui-flip-words',
}))
vi.mock('@/components/ui/flip-button.tsx', () => ({
  FlipButton: 'gui-flip-button',
}))
vi.mock('@/components/ui/flickering-grid.tsx', () => ({
  FlickeringGrid: 'gui-flickering-grid',
}))

vi.mock('@/components/search/illustrations/install.tsx', () => ({
  InstallIllustration: 'gui-install-illustration',
}))
vi.mock('@/components/search/illustrations/serve.tsx', () => ({
  ServeIllustration: 'gui-serve-illustration',
}))
vi.mock('@/components/search/illustrations/discover.tsx', () => ({
  DiscoverIllustration: 'gui-discover-illustration',
}))
vi.mock('@/components/search/illustrations/configure.tsx', () => ({
  ConfigureIllustration: 'gui-configure-illustration',
}))

vi.mock('@/lib/blog-posts.tsx', () => ({
  useBlogPosts: vi.fn().mockReturnValue({
    blogPosts: [
      {
        banner: '/post-1/banner.png',
        bannerAlt: 'post-1 banner',
        date: '2025-11-25',
        link: 'https://blog.vlt.sh/blog/post1',
        summary: 'post 1 mock summary',
        title: 'post 1',
      },
      {
        banner: '/post-2/banner.png',
        bannerAlt: 'post-2 banner',
        date: '2025-11-25',
        link: 'https://blog.vlt.sh/blog/post2',
        summary: 'post 2 mock summary',
        title: 'post 2',
      },
      {
        banner: '/post-3/banner.png',
        bannerAlt: 'post-3 banner',
        date: '2025-11-25',
        link: 'https://blog.vlt.sh/blog/post3',
        summary: 'post 3 mock summary',
        title: 'post 3',
      },
    ] satisfies Post[],
    loading: false,
  }),
}))

expect.addSnapshotSerializer({
  serialize: v => html(v),
  test: () => true,
})

afterEach(() => {
  cleanup()
})

test('search renders default components', () => {
  const { container } = render(<Search />)
  expect(container.innerHTML).toMatchSnapshot()
})
