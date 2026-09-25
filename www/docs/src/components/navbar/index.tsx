'use client'

import Link from 'next/link'
import { getMenuContent } from './data'
import {
  NavigationMenu,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from '@/components/ui/navigation-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { cn } from 'cn'
import { Logo } from './logo'
import { isGroup, isItem } from './types'
import { MenuGroupContent } from './menu-group-content'
import { MobileMenu } from './mobile-menu'

const isExternalLink = (href: string) => {
  return href.startsWith('http://') || href.startsWith('https://')
}

const menuContent = getMenuContent()

// vlt.io's marketing header in its flat `disableScrollEffect` form: no float-on-scroll, auth, or package search
export const Navbar = ({
  className,
  ...props
}: React.ComponentProps<'header'>) => {
  return (
    <header
      className={cn('sticky top-0 z-50 w-full', className)}
      {...props}>
      <nav
        className="bg-background border-border flex h-(--header-height) w-full items-center justify-between gap-3 border-b px-3"
        aria-label="Main navigation">
        <div className="flex items-center gap-2">
          {/* opens the docs sidebar sheet on mobile */}
          <SidebarTrigger className="md:hidden" />
          <Logo />
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <NavigationMenu>
            <NavigationMenuList>
              {menuContent.map((item, i) => {
                if (isGroup(item)) {
                  return (
                    <NavigationMenuItem key={i}>
                      <NavigationMenuTrigger
                        className={cn(
                          'bg-transparent',
                          item.hiddenDesktop && 'hidden',
                        )}
                        onPointerDown={e => e.preventDefault()}
                        onClick={e => e.preventDefault()}>
                        {item.group}
                      </NavigationMenuTrigger>
                      <MenuGroupContent group={item} />
                    </NavigationMenuItem>
                  )
                } else if (isItem(item)) {
                  const isExternal = isExternalLink(item.path)
                  return (
                    <NavigationMenuLink
                      key={i}
                      asChild
                      className="rounded-md px-4">
                      {isExternal ?
                        <a
                          className="hover:bg-accent rounded-md p-2 font-medium"
                          href={item.path}
                          target={item.target}
                          rel="noopener noreferrer">
                          {item.label}
                          {item.target === '_blank' && (
                            <span className="sr-only">
                              {' '}
                              (opens in new window)
                            </span>
                          )}
                        </a>
                      : <Link
                          className="hover:bg-accent rounded-md p-2 font-medium"
                          href={item.path}>
                          {item.label}
                        </Link>
                      }
                    </NavigationMenuLink>
                  )
                }
                return null
              })}
              <NavigationMenuIndicator />
            </NavigationMenuList>
            <NavigationMenuViewport className="bg-white dark:bg-black" />
          </NavigationMenu>
        </div>
        <MobileMenu menuData={menuContent} />
      </nav>
    </header>
  )
}
