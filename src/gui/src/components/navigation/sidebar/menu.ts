import { Query, Config } from '@/components/icons/index.ts'
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

export const settingsMenuItems: MenuItem[] = [
  {
    title: 'General',
    url: '/settings/general',
    icon: Config,
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
  {
    title: 'Settings',
    url: '/settings',
    icon: Config,
  },
]
