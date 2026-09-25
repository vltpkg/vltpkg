import { VltClient } from '@/components/icons/vlt-client'
import { Vsr } from '@/components/icons/vsr'
import { OpenSourceInitiative } from '@/components/icons/open-source-initiative'
import {
  BookOpen,
  Megaphone,
  LaptopMinimal,
  FlaskConical,
  Package,
  Share2,
  SearchCheck,
  Rss,
  ShieldHalf,
  ScanEye,
  Antenna,
} from 'lucide-react'
import type { MenuData, MenuGroup } from './types'

// vlt.io's marketing paths are site-relative; the docs live on another host
const VLT = 'https://www.vlt.io'

export const getMenuContent = (): MenuData[] => {
  const openSourceGroup: MenuGroup = {
    group: 'Open Source',
    children: [
      {
        icon: OpenSourceInitiative,
        label: 'Packages & Ecosystem',
        subtitle: 'Explore all vlt packages, tools, and libraries',
        path: VLT + '/open-source',
        featured: true,
      },
      {
        icon: VltClient,
        label: 'Package Manager',
        subtitle: 'Fastest and secure package management',
        path: VLT + '/open-source/client',
      },
      {
        icon: Vsr,
        label: 'VSR',
        subtitle: 'Self-hosted serverless registry',
        path: VLT + '/open-source/serverless-registry',
      },
      {
        icon: SearchCheck,
        label: 'Policies',
        subtitle: 'Dependency policy CI gates',
        path: VLT + '/open-source/policies',
      },
      {
        icon: FlaskConical,
        label: 'Reproducibility',
        subtitle: 'Origin source & artifact verification',
        path: VLT + '/open-source/reproduce',
      },
    ],
  }

  const platformGroup: MenuGroup = {
    group: 'Platform',
    children: [
      {
        icon: Antenna,
        label: 'Registry',
        subtitle: 'The private registry for teams',
        path: VLT + '/platform/registry',
      },
      {
        icon: ShieldHalf,
        label: 'Security',
        subtitle: 'Safe registry-level protection',
        path: VLT + '/platform/security',
      },
      {
        icon: ScanEye,
        label: 'Observability',
        subtitle: 'Explore and trace your supply chain',
        path: VLT + '/platform/observability',
      },
      {
        icon: Package,
        label: 'Packages',
        subtitle: 'Hosted Package Registries & Mirrors',
        path: VLT + '/platform/packages',
      },
      {
        icon: Share2,
        label: 'Projects',
        subtitle: 'Advanced Dependency Graph Observability',
        path: VLT + '/platform/projects',
      },
    ],
  }

  return [
    platformGroup,
    openSourceGroup,
    {
      group: 'Company',
      children: [
        {
          icon: Rss,
          label: 'Blog',
          subtitle: 'Latest news',
          path: VLT + '/blog',
        },
        {
          icon: BookOpen,
          label: 'About',
          subtitle: 'Our mission',
          path: VLT + '/about',
        },
        {
          icon: Megaphone,
          label: 'Press',
          subtitle: 'Latest coverage',
          path: VLT + '/press',
        },
        {
          icon: LaptopMinimal,
          label: 'Careers',
          subtitle: 'Join the Team',
          path: VLT + '/careers',
          badge: "We're hiring!",
        },
      ],
    },
    { label: 'Pricing', path: VLT + '/pricing' },
    {
      label: 'Benchmarks',
      path: 'https://benchmarks.vlt.sh',
      target: '_blank',
    },
    {
      label: 'Community',
      path: 'https://discord.com/invite/qdbXTqxZzZ',
      target: '_blank',
    },
    { label: 'Feedback', path: '/feedback' },
  ]
}
