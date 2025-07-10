import { VltClient, Vsr } from '@/components/icons/index.ts'

import type { LucideIcon } from 'lucide-react'
import type { HTMLAttributeAnchorTarget } from 'react'

export interface MenuItem {
  icon?: LucideIcon
  title: string
  path?: string
  children?: MenuItem[]
  target?: HTMLAttributeAnchorTarget
}

export const menuData: MenuItem[] = [
  {
    title: 'Product',
    children: [
      {
        icon: VltClient,
        title: 'Client',
        path: 'https://vlt.sh/client',
        target: '_blank',
      },
      {
        icon: Vsr,
        title: 'Serverless Registry',
        path: 'https://vlt.sh/serverless-registry',
        target: '_blank',
      },
    ],
  },
  { title: 'Docs', path: 'https://docs.vlt.sh/', target: '_blank' },
  { title: 'Blog', path: 'https://blog.vlt.sh/', target: '_blank' },
  {
    title: 'Company',
    path: 'https://vlt.sh/company',
    target: '_blank',
  },
]
