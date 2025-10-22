import { Query, Config } from '@/components/icons/index.ts'
import {
  CircleHelp,
  LayoutDashboard,
  Library,
  Search,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface MenuItem {
  title: string
  url?: string
  icon?:
    | LucideIcon
    | React.ComponentType<React.SVGProps<SVGSVGElement>>
  isActive?: boolean
  items?: MenuItem[]
  external?: boolean
  externalIcon?: boolean
  badge?: string
  onClick?: () => void
}

export const mainMenuItems: MenuItem[] = [
  {
    title: 'Home',
    url: '/',
    icon: Search,
  },
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Queries',
    url: '/queries',
    icon: Query,
  },
]

export const helpMenuItems: MenuItem[] = [
  {
    title: 'Selectors',
    url: '/help/selectors',
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
        icon: Query,
      },
      {
        title: 'Documentation',
        url: 'https://docs.vlt.sh',
        icon: Library,
      },
    ],
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Config,
  },
]
