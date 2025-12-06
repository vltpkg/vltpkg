import { useState, useEffect, useRef, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router'
import { Search, Loader2, Command } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSearchResultsStore } from '@/state/search-results.ts'
import { useKeyDown } from '@/components/hooks/use-keydown.tsx'
import { useDebounce } from '@/components/hooks/use-debounce.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Kbd } from '@/components/ui/kbd.tsx'
import { useScroll } from '@/components/hooks/use-scroll.tsx'
import { menuContent } from '@/components/navigation/marketing-menu/data.ts'
import {
  NavigationMenu,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from '@/components/ui/navigation-menu.tsx'
import {
  InputGroupInput,
  InputGroup,
  InputGroupAddon,
} from '@/components/ui/input-group.tsx'
import { Vlt } from '@/components/icons/index.ts'
import { cn } from '@/lib/utils.ts'
import { Logo } from './logo.tsx'
import { isGroup, isItem } from './types.ts'
import { MenuGroupContent } from './menu-group-content.tsx'
import { ListItem } from './list-item.tsx'
import { isHostedEnvironment } from '@/lib/environment.ts'
import { useAuth } from '@/components/hooks/use-auth.tsx'

import type { MotionProps } from 'framer-motion'

const MotionSearch = motion.create(Search)
const MotionLoader = motion.create(Loader2)

const iconMotion: MotionProps = {
  initial: { opacity: 0, filter: 'blur(2px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(2px)' },
}

import type { ComponentProps } from 'react'

const isExternalLink = (href: string) => {
  return href.startsWith('http://') || href.startsWith('https://')
}

export const Header = () => {
  const [open, setOpen] = useState(false)
  const scrolled = useScroll(10)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { pathname } = useLocation()
  const isLoading = useSearchResultsStore(state => state.isLoading)
  const searchTerm = useSearchResultsStore(state => state.searchTerm)
  const setSearchTerm = useSearchResultsStore(
    state => state.setSearchTerm,
  )
  const executeSearch = useSearchResultsStore(
    state => state.executeSearch,
  )

  const isHostedMode = isHostedEnvironment()
  const { isSignedIn } = useAuth()

  const homeUrl = !isSignedIn && isHostedMode ? '/' : '/dashboard'

  const isSearch = pathname.includes('search')

  useEffect(() => {
    if (open) {
      // Disable scroll
      document.body.style.overflow = 'hidden'
    } else {
      // Re-enable scroll
      document.body.style.overflow = ''
    }

    // Cleanup when component unmounts
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useKeyDown(['meta+k', 'ctrl+k'], () => inputRef.current?.focus())
  useKeyDown(['escape'], () => inputRef.current?.blur())

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  useEffect(() => {
    executeSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm])

  // On initial load, when there is no searchTerm, focus the input asap
  // so the user can start searching right away
  useEffect(() => {
    if (!searchTerm || searchTerm.trim() === '') {
      inputRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full max-w-full border-b border-transparent will-change-auto lg:mx-auto lg:max-w-5xl lg:rounded-2xl lg:border lg:transition-all lg:ease-out xl:max-w-[66.7%]',
        {
          'border-border bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg lg:top-4 lg:shadow':
            scrolled,
        },
      )}>
      <nav
        className={cn(
          'flex h-14 w-full items-center justify-between px-4 will-change-auto max-lg:gap-3 lg:h-12 lg:transition-all lg:ease-out',
          {
            'lg:px-2': scrolled,
          },
        )}
        aria-label="Main navigation">
        {isSearch ?
          <div className="flex w-full items-center gap-3">
            <NavLink to={homeUrl}>
              <Vlt className="size-6 shrink-0" />
            </NavLink>
            <InputGroup className="w-full grow rounded-xl">
              <InputGroupAddon align="inline-start">
                <AnimatePresence mode="wait">
                  {isLoading ?
                    <MotionLoader
                      {...iconMotion}
                      key="results-is-loading"
                      className="animate-spin"
                    />
                  : <MotionSearch
                      {...iconMotion}
                      key="results-not-loading"
                    />
                  }
                </AnimatePresence>
              </InputGroupAddon>
              <InputGroupInput
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                ref={inputRef}
                placeholder="Search packages"
              />
              <InputGroupAddon
                align="inline-end"
                className="flex gap-1">
                <Kbd className="!rounded-md">
                  <Command />
                </Kbd>
                <Kbd className="!rounded-md">K</Kbd>
              </InputGroupAddon>
            </InputGroup>
            <div className="flex items-center gap-2 max-lg:hidden">
              <Button variant="outline" asChild>
                <NavLink
                  to="https://docs.vlt.sh/registry/getting-started"
                  rel="noopener noreferrer">
                  Get Started
                </NavLink>
              </Button>
              <Button variant="default" asChild>
                <NavLink to="/dashboard" rel="noopener noreferrer">
                  Dashboard
                </NavLink>
              </Button>
            </div>
          </div>
        : <Fragment>
            <Logo />
            <div className="hidden items-center gap-2 lg:flex">
              <NavigationMenu>
                <NavigationMenuList>
                  {menuContent.map((item, i) => {
                    if (isGroup(item)) {
                      return (
                        <NavigationMenuItem key={i}>
                          <NavigationMenuTrigger
                            className="bg-transparent"
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
                              <span className="sr-only">
                                {' '}
                                (opens in new window)
                              </span>
                            </a>
                          : <NavLink
                              className="hover:bg-accent rounded-md p-2 font-medium"
                              to={item.path}>
                              {item.label}
                            </NavLink>
                          }
                        </NavigationMenuLink>
                      )
                    }
                    return null
                  })}
                  <NavigationMenuIndicator />
                </NavigationMenuList>
                <NavigationMenuViewport className="bg-popover/80 backdrop-blur-lg" />
              </NavigationMenu>
              <Button variant="outline" asChild>
                <NavLink
                  to="https://docs.vlt.sh/registry/getting-started"
                  rel="noopener noreferrer">
                  Get Started
                </NavLink>
              </Button>
              <Button variant="default" asChild>
                <NavLink to="/dashboard" rel="noopener noreferrer">
                  Dashboard
                </NavLink>
              </Button>
            </div>
          </Fragment>
        }
        <Button
          ref={menuButtonRef}
          className="lg:hidden"
          onClick={() => setOpen(!open)}
          variant="outline"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? 'Close' : 'Menu'}
        </Button>
      </nav>

      <MobileMenu
        className="flex flex-col justify-between gap-2"
        open={open}
        onClose={() => setOpen(false)}>
        <nav aria-label="Mobile navigation">
          <NavigationMenu className="max-w-full items-start">
            <div className="flex w-full flex-col gap-y-2">
              {menuContent.map((item, i) => {
                if (isGroup(item)) {
                  return (
                    <div key={i}>
                      <div className="mb-2">
                        <span className="text-sm font-medium">
                          {item.group}
                        </span>
                        {item.description && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.children.map((child, childIndex) => {
                        if (isGroup(child)) {
                          return (
                            <div key={childIndex} className="mb-2">
                              <div className="mb-1">
                                <span className="text-xs font-medium">
                                  {child.group}
                                </span>
                                {child.description && (
                                  <p className="text-muted-foreground mt-1 text-xs">
                                    {child.description}
                                  </p>
                                )}
                              </div>
                              {child.children.map(
                                (nestedChild, nestedIndex) => {
                                  if (isItem(nestedChild)) {
                                    return (
                                      <ListItem
                                        className="px-0"
                                        key={nestedIndex}
                                        {...nestedChild}
                                      />
                                    )
                                  }
                                  return null
                                },
                              )}
                            </div>
                          )
                        } else if (isItem(child)) {
                          return (
                            <ListItem
                              className="px-0"
                              key={childIndex}
                              {...child}
                            />
                          )
                        }
                        return null
                      })}
                    </div>
                  )
                } else if (isItem(item)) {
                  return (
                    <ListItem className="px-0" key={i} {...item} />
                  )
                }
                return null
              })}
            </div>
          </NavigationMenu>
        </nav>
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="w-full" asChild>
            <NavLink to="/dashboard" rel="noopener noreferrer">
              Dashboard
            </NavLink>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <NavLink
              to="https://docs.vlt.sh/registry/getting-started"
              rel="noopener noreferrer">
              Get Started
            </NavLink>
          </Button>
        </div>
      </MobileMenu>
    </header>
  )
}

interface MobileMenuProps extends ComponentProps<'div'> {
  open: boolean
  onClose: () => void
}

const MobileMenu = ({
  open,
  onClose: _onClose,
  children,
  className,
  ...props
}: MobileMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)

  // Trap focus within mobile menu when open
  useEffect(() => {
    if (!open || typeof window === 'undefined') return

    const menu = menuRef.current
    if (!menu) return

    // Get all focusable elements
    const focusableElements = menu.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )

    const firstElement = focusableElements[0]
    const lastElement =
      focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    menu.addEventListener('keydown', handleTabKey)
    // Focus first element when menu opens
    firstElement?.focus()

    return () => {
      menu.removeEventListener('keydown', handleTabKey)
    }
  }, [open])

  if (!open || typeof window === 'undefined') {
    return null
  }

  return createPortal(
    <div
      ref={menuRef}
      className={cn(
        'bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg',
        'fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-y lg:hidden',
      )}
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile menu">
      <div
        className={cn(
          'data-[slot=open]:zoom-in-97 data-[slot=open]:animate-in ease-out',
          'size-full p-4',
          className,
        )}
        data-slot={open}
        {...props}>
        {children}
      </div>
    </div>,
    document.body,
  )
}
