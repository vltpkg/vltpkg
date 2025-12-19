import { User, LogOut } from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

export interface MenuItem {
  to?: string
  label: string
  icon?: LucideIcon
  action?: 'login' | 'logout' | 'profile'
}

export interface MenuGroup {
  label?: string
  children: MenuItem[]
}

export const menuItems: MenuGroup[] = [
  {
    label: 'My Account',
    children: [
      {
        label: 'Profile',
        icon: User,
        action: 'profile',
      },
    ],
  },
  {
    children: [
      {
        label: 'Logout',
        icon: LogOut,
        action: 'logout',
      },
    ],
  },
]
