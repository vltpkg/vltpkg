import {
  GitHubIcon,
  LinkedInIcon,
  TwitterIcon,
  DiscordIcon,
} from '@/components/icons/icons.ts'

export interface Content {
  icon?: (props?: React.SVGProps<SVGSVGElement>) => React.ReactNode
  slug: string
  href: string
}

export interface Section {
  title: string
  contents: Content[]
}

const products: Section = {
  title: 'Products',
  contents: [
    {
      slug: 'Client',
      href: 'https://vlt.io/open-source/client',
    },
    {
      slug: 'Serverless Registry',
      href: 'https://vlt.io/open-source/serverless-registry',
    },
  ],
}

const resources: Section = {
  title: 'Resources',
  contents: [
    {
      slug: 'Client Docs',
      href: 'https://docs.vlt.io',
    },
    {
      slug: 'Pricing',
      href: 'https://vlt.io/open-source/serverless-registry',
    },
    {
      slug: 'Brand Kit',
      href: 'https://www.vlt.io/brand-kit',
    },
  ],
}

const company: Section = {
  title: 'Company',
  contents: [
    {
      slug: 'About',
      href: 'https://www.vlt.io/about',
    },
    {
      slug: 'Blog',
      href: 'https://vlt.io/blog',
    },
    {
      slug: 'Privacy',
      href: 'https://www.vlt.io/privacy',
    },
    {
      slug: 'Terms',
      href: 'https://www.vlt.io/terms',
    },
  ],
}

const socials: Section = {
  title: 'Social',
  contents: [
    {
      icon: (props?) => <GitHubIcon {...props} />,
      slug: 'GitHub',
      href: 'https://github.com/vltpkg',
    },
    {
      icon: (props?) => <LinkedInIcon {...props} />,
      slug: 'LinkedIn',
      href: 'https://www.linkedin.com/company/vltpkg/',
    },
    {
      icon: (props?) => <TwitterIcon {...props} />,
      slug: 'Twitter',
      href: 'https://x.com/vltpkg',
    },
    {
      icon: (props?) => <DiscordIcon {...props} />,
      slug: 'Discord',
      href: 'https://discord.gg/vltpkg',
    },
  ],
}

export const footerContent: Section[] = [
  products,
  resources,
  company,
  socials,
]
