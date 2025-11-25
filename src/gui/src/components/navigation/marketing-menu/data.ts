import { VltClient, Vsr } from '@/components/icons/index.ts'
import { BookOpen, Heart, LaptopMinimal } from 'lucide-react'
import type { MenuData } from './types.ts'

export const menuContent: MenuData[] = [
  {
    group: 'Products',
    children: [
      {
        icon: VltClient,
        label: 'Client',
        subtitle: 'vlt',
        path: 'https://www.vlt.sh/client',
      },
      {
        icon: Vsr,
        label: 'Serverless Registry',
        subtitle: 'VSR',
        path: 'https://www.vlt.sh/serverless-registry',
      },
    ],
  },
  {
    group: 'Company',
    description: 'Learn about our mission and team',
    children: [
      {
        icon: BookOpen,
        label: 'About',
        path: 'https://www.vlt.sh/company',
      },
      {
        icon: Heart,
        label: 'Love',
        path: 'https://www.vlt.sh/love',
      },
      {
        icon: LaptopMinimal,
        label: 'Careers',
        path: 'https://www.vlt.sh/company',
      },
    ],
  },
  { label: 'Docs', path: 'https://docs.vlt.sh/', target: '_blank' },
  { label: 'Blog', path: 'https://blog.vlt.sh/' },
  {
    label: 'Benchmarks',
    path: 'https://benchmarks.vlt.sh',
    target: '_blank',
  },
]
