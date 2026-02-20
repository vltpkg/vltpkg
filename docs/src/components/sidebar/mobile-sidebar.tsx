import React, { useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import type {
  SidebarEntry,
  Group,
  SidebarEntries,
} from '@/components/sidebar/sidebar.tsx'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer.tsx'
import { ScrollArea } from '@/components/ui/scroll-area.tsx'

interface MobileSidebarProps {
  sidebar: SidebarEntries
}

const MobileSidebar = ({ sidebar }: MobileSidebarProps) => {
  const [open, setOpen] = useState<boolean>(false)

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          className="flex cursor-pointer md:hidden"
          variant="outline">
          Menu
        </Button>
      </DrawerTrigger>
      <DrawerContent className="mx-1 max-h-[70svh] border border-white/20 bg-gradient-to-br from-neutral-100 to-neutral-200 pb-12 dark:from-neutral-900 dark:to-neutral-950">
        <DrawerDescription></DrawerDescription>
        <DrawerHeader className="flex items-stretch justify-between gap-x-4 border-b border-black/5 px-1 py-0.5 dark:border-white/10">
          <DrawerTitle className="flex items-center justify-start px-3 text-sm text-neutral-700 dark:text-neutral-400">
            Menu
          </DrawerTitle>
          <DrawerClose asChild>
            <Button
              size="icon"
              variant="ghost"
              className="cursor-pointer bg-transparent">
              <X
                size={16}
                className="text-neutral-950 dark:text-white"
              />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <ScrollArea className="max-h-[calc(70svh-3rem)] overflow-y-auto">
          <div className="divide-y divide-border">
            {renderMenu(sidebar, 0)}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}

const renderMenu = (items: SidebarEntries, depth: number) => {
  return items.map((entry, index) => {
    if (entry.type === 'group') {
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
    <div className="flex h-full w-full flex-col overflow-y-scroll py-1">
      <Button
        onClick={toggle}
        variant="ghost"
        className="w-full cursor-pointer items-center justify-between bg-transparent hover:bg-transparent">
        <span className="font-medium capitalize">{entry.label}</span>
        {expanded ?
          <ChevronDown className="size-4" />
        : <ChevronRight className="size-4" />}
      </Button>
      {expanded && (
        <div className="ml-4 flex flex-col border-l border-border">
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
      className="w-full cursor-pointer items-center justify-start bg-transparent capitalize hover:bg-transparent"
      variant="ghost">
      <a
        href={entry.href}
        className="font-medium text-primary no-underline">
        {entry.label}
      </a>
    </Button>
  )
}

export default MobileSidebar
