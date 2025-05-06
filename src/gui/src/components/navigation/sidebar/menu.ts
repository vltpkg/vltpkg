import { Query } from '@/components/icons/query.tsx'
import { CircleHelp, LayoutDashboard, Library } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface MenuItem {
  title: string
  url?: string
  icon?:
    | LucideIcon
    | React.ComponentType<React.SVGProps<SVGSVGElement>>
  vltIcon?: boolean
  isActive?: boolean
  items?: MenuItem[]
  external?: boolean
  externalIcon?: boolean
  badge?: string
  onClick?: () => void
}

export const mainMenuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Queries',
    url: '/queries',
    icon: Query,
    vltIcon: true,
  },
]

export const helpMenuItems: MenuItem[] = [
  {
    title: 'Selectors',
    url: '/help/selectors',
    vltIcon: true,
    icon: Query,
  },
]

export const footerMenuItems: MenuItem[] = [
  {
    title: 'Help',
    icon: CircleHelp,
    items: [
      {
        title: 'Selectors',
        url: '/help/selectors',
        vltIcon: true,
        icon: Query,
      },
      {
        title: 'Documentation',
        url: 'https://docs.vlt.sh',
        icon: Library,
        external: true,
      },
    ],
  },
]
