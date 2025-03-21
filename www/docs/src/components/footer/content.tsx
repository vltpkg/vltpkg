import {
  GitHubIcon,
  LinkedInIcon,
  TwitterIcon,
  DiscordIcon,
} from '@/components/icons/icons'

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
      href: 'https://www.vlt.sh/client',
    },
    {
      slug: 'Serverless Registry',
      href: 'https://www.vlt.sh/serverless-registry',
    },
  ],
}

const resources: Section = {
  title: 'Resources',
  contents: [
    {
      slug: 'Client Docs',
      href: 'https://docs.vlt.sh',
    },
    {
      slug: 'VSR Docs',
      href: 'https://github.com/vltpkg/vsr',
    },
    {
      slug: 'Pricing',
      href: 'https://www.vlt.sh/serverless-registry',
    },
    {
      slug: 'Brand Kit',
      href: 'https://www.vlt.sh/brand',
    },
  ],
}

const company: Section = {
  title: 'Company',
  contents: [
    {
      slug: 'About',
      href: 'https://www.vlt.sh/company',
    },
    {
      slug: 'Blog',
      href: 'https://blog.vlt.sh/',
    },
    {
      slug: 'Privacy',
      href: 'https://www.vlt.sh/privacy',
    },
    {
      slug: 'Terms',
      href: 'https://www.vlt.sh/terms',
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
