'use client'

import { Fragment, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  Sheet,
  SheetTitle,
  SheetHeader,
  SheetContent,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Logo } from './logo'
import { toSections } from './types'
import type { MenuData, MenuItem } from './types'

interface MobileMenuProps {
  menuData: MenuData[]
}

const renderItem = (
  item: MenuItem,
  onNavigate: () => void,
): ReactNode => {
  const isExternal = item.target === '_blank'
  const Icon = item.icon

  return (
    <Button
      key={item.path}
      asChild
      variant="ghost"
      className="text-foreground hover:text-foreground w-full justify-start font-medium">
      <Link
        href={item.path}
        target={item.target}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        onClick={onNavigate}>
        {Icon && (
          <div className="outline-border flex size-5 shrink-0 items-center justify-center rounded-sm outline-1">
            <Icon
              className="text-muted-foreground size-3.5"
              aria-hidden="true"
            />
          </div>
        )}
        <span>{item.label}</span>
      </Link>
    </Button>
  )
}

// vlt.io's mobile drawer, as a bottom sheet (vaul isn't a dependency here); no auth or socials
export const MobileMenu = ({ menuData }: MobileMenuProps) => {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const sections = useMemo(() => toSections(menuData), [menuData])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="sm"
          className="lg:hidden"
          variant="outline"
          aria-label="Open menu">
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="bg-background text-foreground max-h-[85svh] gap-0">
        <SheetTitle className="sr-only">Mobile menu</SheetTitle>
        <SheetDescription className="sr-only">
          Site navigation
        </SheetDescription>

        <SheetHeader className="border-border flex w-full flex-row items-center border-b p-3 text-left">
          <Logo onClick={close} />
        </SheetHeader>

        <nav
          className="flex flex-1 flex-col overflow-y-auto p-3"
          aria-label="Mobile navigation">
          {sections.map((section, i) => (
            <Fragment key={section.label ?? `__standalone-${i}`}>
              {i > 0 && <hr className="border-border -mx-3 my-2" />}
              {section.label && (
                <div className="text-muted-foreground px-4 py-2 text-sm font-medium">
                  {section.label}
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map(item => renderItem(item, close))}
              </div>
            </Fragment>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
