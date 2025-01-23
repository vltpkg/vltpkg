import { LayoutDashboard, type LucideIcon } from 'lucide-react'

export interface Item {
  title: string
  url: string
}

export interface MenuItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: Item[]
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
]

export default menuItems
