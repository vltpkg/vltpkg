import type { LucideIcon } from 'lucide-react'
import type { ComponentType, HTMLAttributeAnchorTarget } from 'react'

/** Lucide SVGs or small raster marks (e.g. OSI logo) used in mega-menu tiles. */
export type MenuItemIcon =
  LucideIcon | ComponentType<{ className?: string }>

export type MenuData = MenuGroup | MenuItem

export interface MenuGroup {
  group: string
  description?: string
  children: (MenuItem | MenuGroup)[]
  hiddenDesktop?: boolean
}

export interface MenuItem {
  icon?: MenuItemIcon
  label: string
  path: string
  subtitle?: string
  blurb?: string
  badge?: string
  target?: HTMLAttributeAnchorTarget
  /** Renders the item as a prominent CTA (outline button) rather than a leaf link. */
  cta?: boolean
  /** Spans all columns in a flat mega-menu grid (e.g. Open Source overview). */
  featured?: boolean
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

/** Flattened list shape consumed by the mobile menu — each section is a labeled (or unlabeled) block of leaf items. */
export type Section = {
  label?: string
  items: MenuItem[]
}

/**
 * Walks the menu tree and produces a flat list of sections. Nested groups are hoisted into
 * their own sections (e.g. `Compare` under `Platform` becomes a sibling section). Trailing
 * standalone items collapse into a single unlabeled section.
 */
export const toSections = (data: MenuData[]): Section[] => {
  const sections: Section[] = []
  const standalone: MenuItem[] = []

  const visit = (node: MenuData) => {
    if (isGroup(node)) {
      const items: MenuItem[] = []
      const nested: MenuGroup[] = []
      for (const child of node.children) {
        if (isItem(child)) items.push(child)
        else if (isGroup(child)) nested.push(child)
      }
      sections.push({ label: node.group, items })
      for (const sub of nested) visit(sub)
    } else if (isItem(node)) {
      standalone.push(node)
    }
  }

  for (const node of data) visit(node)
  if (standalone.length) sections.push({ items: standalone })
  return sections
}
