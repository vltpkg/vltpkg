import type { ComponentType } from 'react'

type FooterLink = {
  title: string
  href: string
  icon?: ComponentType<{ className?: string }>
}

export type FooterLinkGroup = {
  label: string
  links: FooterLink[]
}
