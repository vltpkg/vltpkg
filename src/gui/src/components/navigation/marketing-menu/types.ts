import type { LucideIcon } from 'lucide-react'
import type { HTMLAttributeAnchorTarget } from 'react'

export type MenuData = MenuGroup | MenuItem

export interface MenuGroup {
  group: string
  description?: string
  children: (MenuItem | MenuGroup)[]
}

export interface MenuItem {
  icon?: LucideIcon
  label: string
  path: string
  subtitle?: string
  blurb?: string
  target?: HTMLAttributeAnchorTarget
}

export const isGroup = (obj: MenuData): obj is MenuGroup => {
  return 'group' in obj && typeof obj.group === 'string'
}

export const isItem = (obj: MenuData): obj is MenuItem => {
  return (
    !('group' in obj) &&
    typeof obj.label === 'string' &&
    typeof obj.path === 'string'
  )
}
