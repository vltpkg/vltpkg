import { useEffect, useState, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import type { MenuItem } from '@/components/navigation/sidebar/menu.ts'
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar.tsx'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.tsx'
import { useLocation, NavLink } from 'react-router'
import { ArrowUpRight, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils.ts'

interface SidebarMenuLinkProps {
  items: MenuItem[]
  onParentClick?: () => void
}

const sublistVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const sublistItemVariants: Variants = {
  hidden: { opacity: 0, y: -1 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.1, ease: 'easeInOut' },
  },
}

const renderBadge = (item: MenuItem) => {
  if (item.badge) {
    return <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
  }
  return null
}

const renderItems = ({
  items,
  depth = 0,
  pathname,
  hoveredItem,
  setHoveredItem,
  openItems,
  setOpenItems,
  onParentClick,
  state,
  toggleSidebar,
}: {
  items: MenuItem[]
  depth?: number
  pathname: string
  hoveredItem: string | null
  setHoveredItem: (item: string | null) => void
  onParentClick?: () => void
  openItems: Record<string, boolean>
  setOpenItems: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >
  state: 'expanded' | 'collapsed'
  toggleSidebar: () => void
}) => {
  return items.map(item => {
    const Comp = item.url ? NavLink : 'button'
    const MenuItemComp =
      depth > 0 ? SidebarMenuSubItem : SidebarMenuItem
    const MenuItemButton =
      depth > 0 ? SidebarMenuSubButton : SidebarMenuButton
    const MenuRootItem = depth > 0 ? motion.div : Fragment

    const isOpen = openItems[item.title] ?? item.isActive

    return (
      <MenuRootItem
        key={item.title}
        {...(depth > 0 ? { variants: sublistItemVariants } : {})}>
        <Collapsible
          key={`${item.title}-${depth}-collapsible`}
          asChild
          open={isOpen}
          onOpenChange={open =>
            setOpenItems(prev => ({ ...prev, [item.title]: open }))
          }
          onClick={onParentClick}
          className="group/collapsible hover:bg-transparent">
          <MenuItemComp>
            <CollapsibleTrigger
              onClick={
                state === 'collapsed' && item.items?.length ?
                  toggleSidebar
                : undefined
              }
              asChild>
              <MenuItemButton
                asChild
                onMouseLeave={() => setHoveredItem(null)}
                onMouseEnter={() => setHoveredItem(item.title)}
                {...(depth === 0 ? { tooltip: item.title } : {})}
                isActive={pathname === item.url}
                data-active={pathname === item.url}
                className={cn(
                  'data-[active=true]:text-foreground data-[active=true]:dark:bg-muted/60 data-[active=true]:dark:text-foreground [&>*]:data-[active=true]:text-foreground [&>svg]:data-[active=false]:text-muted-foreground whitespace-nowrap data-[active=true]:bg-neutral-200/75',
                )}>
                <Comp
                  to={item.url ? item.url : ''}
                  onClick={item.onClick}
                  role="button"
                  className="group/sidebar-button text-muted-foreground w-full cursor-default transition-colors transition-opacity duration-250 hover:bg-transparent data-[state=open]:hover:bg-transparent">
                  {item.icon && (
                    <item.icon style={{ zIndex: depth + 1 }} />
                  )}
                  <span
                    className="text-muted-foreground"
                    style={{ zIndex: depth + 1 }}>
                    {item.title}
                  </span>
                  {item.externalIcon && item.external && (
                    <ArrowUpRight className="z-[3] ml-auto transition-transform duration-250 group-hover/sidebar-button:translate-x-0.5 group-hover/sidebar-button:-translate-y-0.5" />
                  )}
                  {item.items?.length && (
                    <>
                      <ChevronRight
                        style={{ zIndex: depth + 1 }}
                        className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                      />
                    </>
                  )}
                  {item.badge && renderBadge(item)}

                  <AnimatePresence>
                    {hoveredItem === item.title && (
                      <motion.div
                        layoutId="sidebar-highlight"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          type: 'spring',
                          duration: 0.15,
                          bounce: 0.1,
                        }}
                        exit={{ opacity: 0 }}
                        style={{ zIndex: depth }}
                        className="absolute inset-x-0 top-0 h-[32px] w-full rounded-md bg-neutral-200 dark:bg-neutral-800"
                      />
                    )}
                  </AnimatePresence>
                </Comp>
              </MenuItemButton>
            </CollapsibleTrigger>
            {item.items && item.items.length > 0 && (
              <CollapsibleContent>
                <SidebarMenuSub>
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={sublistVariants}
                    className="flex flex-col gap-1">
                    {renderItems({
                      items: item.items,
                      depth: depth + 1,
                      pathname,
                      hoveredItem,
                      setHoveredItem,
                      openItems,
                      setOpenItems,
                      state,
                      toggleSidebar,
                    })}
                  </motion.div>
                </SidebarMenuSub>
              </CollapsibleContent>
            )}
          </MenuItemComp>
        </Collapsible>
      </MenuRootItem>
    )
  })
}

export const SidebarMenuLink = ({
  onParentClick,
  items,
}: SidebarMenuLinkProps) => {
  const { pathname } = useLocation()
  const { state, toggleSidebar, hoveredItem, setHoveredItem } =
    useSidebar()
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(
    {},
  )

  /**
   * When the sidebar state becomes 'collapsed', we want
   * to close all the open 'Collapsible's'
   */
  useEffect(() => {
    if (state === 'collapsed') {
      setOpenItems(prev => {
        const newState = { ...prev }
        Object.keys(newState).forEach(key => {
          newState[key] = false
        })
        return newState
      })
    }
  }, [state])

  return renderItems({
    items,
    depth: 0,
    pathname,
    hoveredItem,
    setHoveredItem,
    openItems,
    setOpenItems,
    onParentClick,
    state,
    toggleSidebar,
  })
}
