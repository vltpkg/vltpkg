import { useState } from 'react'
import { NavLink } from 'react-router'
import { X as CloseIcon } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx'
import {
  mainMenuItems,
  footerMenuItems,
} from '@/components/navigation/sidebar/menu.ts'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'
import type { MenuItem } from '@/components/navigation/sidebar/menu.ts'

type MobileMenuProps = ComponentProps<typeof Button>

export const MobileMenu = ({ className }: MobileMenuProps) => {
  const [open, setOpen] = useState<boolean>(false)

  const handleOpen = () => setOpen(o => !o)

  return (
    <Sheet open={open}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          onClick={handleOpen}
          className={cn('', className)}>
          <span>Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent showClose={false} side="bottom">
        <SheetHeader className="flex w-full flex-row items-center justify-between">
          <SheetTitle>Menu</SheetTitle>
          <Button
            variant="ghost"
            className="aspect-square !p-0"
            onClick={handleOpen}>
            <CloseIcon />
          </Button>
          <SheetDescription className="sr-only">
            Mobile Menu
          </SheetDescription>
        </SheetHeader>

        <ul className="flex flex-col gap-3 px-3">
          {mainMenuItems.map((item, idx) => (
            <MenuItem item={item} key={`mobile-main-menu-${idx}`} />
          ))}
        </ul>

        <SheetFooter>
          <div className="flex w-full flex-col gap-3">
            {footerMenuItems.some(
              item => item.items && item.items.length > 0,
            ) && (
              <Accordion type="single" collapsible className="w-full">
                {footerMenuItems
                  .filter(item => item.items && item.items.length > 0)
                  .map((item, idx) => (
                    <MenuItem
                      item={item}
                      key={`mobile-footer-menu-accordion-${idx}`}
                    />
                  ))}
              </Accordion>
            )}
            <ul className="flex flex-col gap-3">
              {footerMenuItems
                .filter(
                  item => !item.items || item.items.length === 0,
                )
                .map((item, idx) => (
                  <MenuItem
                    item={item}
                    key={`mobile-footer-menu-${idx}`}
                  />
                ))}
            </ul>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

interface MenuItemProps {
  item: MenuItem
}

const MenuItem = ({ item }: MenuItemProps) => {
  // If item has nested children, use Accordion
  if (item.items && item.items.length > 0) {
    return (
      <AccordionItem value={item.title}>
        <AccordionTrigger className="text-foreground py-2">
          <div className="flex items-center gap-1">
            {item.icon && (
              <span className="flex size-6 items-center justify-center [&_svg]:size-5">
                <item.icon />
              </span>
            )}
            <span className="text-sm font-medium">{item.title}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <ul className="flex flex-col gap-2 pl-6">
            {item.items.map((subItem, idx) => (
              <li key={`sub-item-${idx}`}>
                {subItem.external ?
                  <a
                    href={subItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground flex items-center gap-1 hover:underline">
                    {subItem.icon && (
                      <span className="flex size-6 items-center justify-center [&_svg]:size-5">
                        <subItem.icon />
                      </span>
                    )}
                    <span className="text-sm font-medium">
                      {subItem.title}
                    </span>
                  </a>
                : <NavLink
                    to={subItem.url ?? ''}
                    className="text-foreground flex items-center gap-1 hover:underline">
                    {subItem.icon && (
                      <span className="flex size-6 items-center justify-center [&_svg]:size-5">
                        <subItem.icon />
                      </span>
                    )}
                    <span className="text-sm font-medium">
                      {subItem.title}
                    </span>
                  </NavLink>
                }
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    )
  }

  // Regular menu item without children
  return (
    <li>
      {item.external ?
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground flex items-center gap-1 hover:underline">
          {item.icon && (
            <span className="flex size-6 items-center justify-center [&_svg]:size-5">
              <item.icon />
            </span>
          )}
          <span className="text-sm font-medium">{item.title}</span>
        </a>
      : <NavLink
          to={item.url ?? ''}
          className="text-foreground flex items-center gap-1 hover:underline">
          {item.icon && (
            <span className="flex size-6 items-center justify-center [&_svg]:size-5">
              <item.icon />
            </span>
          )}
          <span className="text-sm font-medium">{item.title}</span>
        </NavLink>
      }
    </li>
  )
}
