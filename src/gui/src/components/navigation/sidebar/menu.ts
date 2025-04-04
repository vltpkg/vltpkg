import { Query } from '@/components/icons/query.jsx'
import { LayoutDashboard } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface Item {
  title: string
  url: string
}

export interface MenuItem {
  title: string
  url: string
  icon?:
    | LucideIcon
    | React.ComponentType<React.SVGProps<SVGSVGElement>>
  isActive?: boolean
  items?: Item[]
}

export const mainMenuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    url: '/',
    icon: LayoutDashboard,
  },
]

export const helpMenuItems: MenuItem[] = [
  {
    title: 'Selectors',
    url: '/help/selectors',
    icon: Query,
  },
]
