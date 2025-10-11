import { User, LogOut, BookOpen } from 'lucide-react'
import { Config, Github } from '@/components/icons/index.ts'

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
      {
        to: '/settings',
        label: 'Settings',
        icon: Config,
      },
    ],
  },
  {
    label: 'Resources',
    children: [
      {
        to: 'https://github.com/vltpkg/vltpkg',
        label: 'GitHub',
        icon: Github,
      },
      {
        to: 'https://docs.vlt.sh',
        label: 'Support',
        icon: BookOpen,
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
