import type { FooterLinkGroup } from './types'

export const footerLinkGroups: FooterLinkGroup[] = [
  {
    label: 'Products',
    links: [
      { title: 'Client', href: 'https://www.vlt.sh/products/client' },
      {
        title: 'Serverless Registry',
        href: 'https://www.vlt.sh/products/serverless-registry',
      },
    ],
  },
  {
    label: 'Resources',
    links: [
      { title: 'Documentation', href: 'https://docs.vlt.sh' },
      {
        title: 'Pricing',
        href: 'https://www.vlt.sh/products/serverless-registry#pricing',
      },
      { title: 'Brand Kit', href: 'https://www.vlt.sh/brand-kit' },
      { title: 'Benchmarks', href: 'https://benchmarks.vlt.sh/' },
      { title: 'Join', href: 'https://www.vlt.sh/join' },
    ],
  },
  {
    label: 'Company',
    links: [
      { title: 'About', href: 'https://www.vlt.sh/about' },
      { title: 'Blog', href: 'https://www.vlt.sh/blog' },
      { title: 'Terms', href: 'https://www.vlt.sh/terms' },
      { title: 'Privacy', href: 'https://www.vlt.sh/privacy' },
      { title: 'Security', href: 'https://www.vlt.sh/security' },
    ],
  },
  {
    label: 'Social',
    links: [
      { title: 'GitHub', href: 'https://github.com/vltpkg' },
      {
        title: 'LinkedIn',
        href: 'https://www.linkedin.com/company/vltpkg/',
      },
      { title: 'Twitter', href: 'https://x.com/vltpkg' },
      { title: 'Discord', href: 'https://discord.gg/vltpkg' },
    ],
  },
]
