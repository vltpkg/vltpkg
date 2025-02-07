import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import {
  type SidebarEntry,
  type Group,
  type SidebarEntries,
} from '@/components/sidebar/app-sidebar'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'

interface MobileSidebarProps {
  sidebar: SidebarEntries
}

const MobileSidebar = ({ sidebar }: MobileSidebarProps) => {
  const [open, setOpen] = useState<boolean>(false)

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          className="md:hidden flex cursor-pointer"
          variant="outline">
          Menu
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-screen mx-1 border border-white/20 bg-gradient-to-br from-neutral-100 to-neutral-200 pb-12 dark:from-neutral-900 dark:to-neutral-950">
        <DrawerHeader className="flex items-stretch justify-between gap-x-4 border-b border-black/5 px-2 py-2 dark:border-white/10">
          <DrawerTitle className="flex items-center justify-start px-3 text-sm text-neutral-700 dark:text-neutral-400">
            Menu
          </DrawerTitle>
          <DrawerClose asChild>
            <Button
              size="icon"
              variant="ghost"
              className="bg-transparent cursor-pointer">
              <X
                size={16}
                className="text-neutral-950 dark:text-white"
              />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="divide-y divide-border">
          {renderMenu(sidebar, 0)}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

const renderMenu = (items: SidebarEntries, depth: number) => {
  return items.map((entry, index) => {
    if (entry.type === 'group' && entry.entries) {
      return (
        <Group key={index} entry={entry} depth={depth}>
          {renderMenu(entry.entries, depth + 1)}
        </Group>
      )
    }
    return <Item key={index} entry={entry} depth={depth} />
  })
}

interface GroupProps {
  entry: Group
  depth?: number
  children: React.ReactNode
}

const Group = ({ entry, children }: GroupProps) => {
  const [expanded, setExpanded] = useState<boolean>(false)

  const toggle = () => {
    setExpanded(!expanded)
  }

  return (
    <div className="flex flex-col w-full py-2 max-h-screen overflow-y-auto">
      <Button
        onClick={toggle}
        variant="ghost"
        className="cursor-pointer justify-between items-center bg-transparent w-full">
        <span className="capitalize font-medium">{entry.label}</span>
        {expanded ?
          <ChevronDown className="size-4" />
        : <ChevronRight className="size-4" />}
      </Button>
      {expanded && (
        <div className="ml-4 border-l border-border flex flex-col">
          {children}
        </div>
      )}
    </div>
  )
}

interface ItemProps {
  entry: SidebarEntry
  depth?: number
}

const Item = ({ entry }: ItemProps) => {
  if (entry.type !== 'link') return

  return (
    <Button
      asChild
      className="capitalize w-full cursor-pointer justify-start items-center bg-transparent"
      variant="ghost">
      <a
        href={entry.href}
        className="no-underline text-primary font-medium">
        {entry.label}
      </a>
    </Button>
  )
}

export default MobileSidebar
