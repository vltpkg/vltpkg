import { useState, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import type { MenuItem } from '@/components/navigation/sidebar/menu.js'
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar.jsx'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.jsx'
import { useLocation, NavLink } from 'react-router'
import { ArrowUpRight, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils.js'

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

export const SidebarMenuLink = ({
  onParentClick,
  items,
}: SidebarMenuLinkProps) => {
  const { pathname } = useLocation()
  const { hoveredItem, setHoveredItem } = useSidebar()
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(
    {},
  )

  const renderBadge = (item: MenuItem) => {
    if (item.badge) {
      return <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
    }
    return null
  }

  const renderItems = (items: MenuItem[], depth = 0) => {
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
              <CollapsibleTrigger asChild>
                <MenuItemButton
                  asChild
                  onMouseLeave={() => setHoveredItem(null)}
                  onMouseEnter={() => setHoveredItem(item.title)}
                  {...(depth === 0 ? { tooltip: item.title } : {})}
                  isActive={pathname === item.url}
                  className={cn(
                    'whitespace-nowrap data-[active=true]:bg-neutral-200/75 data-[active=true]:text-foreground data-[active=true]:dark:bg-muted/60 data-[active=true]:dark:text-foreground',
                    item.vltIcon && '[&>svg]:scale-[2]',
                  )}>
                  <Comp
                    to={item.url ? item.url : ''}
                    onClick={item.onClick}
                    className="duration-250 group/sidebar-button w-full cursor-default text-muted-foreground transition-all hover:bg-transparent data-[state=open]:hover:bg-transparent">
                    {item.icon && (
                      <item.icon style={{ zIndex: depth + 1 }} />
                    )}
                    <span style={{ zIndex: depth + 1 }}>
                      {item.title}
                    </span>
                    {item.external && (
                      <ArrowUpRight className="duration-250 z-[3] ml-auto transition-all group-hover/sidebar-button:-translate-y-0.5 group-hover/sidebar-button:translate-x-0.5" />
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
                            layout: {
                              duration: 0.5,
                              ease: [0.16, 1, 0.3, 1],
                            },
                            opacity: {
                              duration: 0.5,
                              ease: [0.16, 1, 0.3, 1],
                            },
                          }}
                          exit={{ opacity: 0 }}
                          style={{ zIndex: depth }}
                          className="absolute inset-x-0 top-0 h-[32px] w-full rounded-md bg-neutral-200/75 dark:bg-muted/60"
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
                      variants={sublistVariants}>
                      {renderItems(item.items, depth + 1)}
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

  return renderItems(items, 0)
}
