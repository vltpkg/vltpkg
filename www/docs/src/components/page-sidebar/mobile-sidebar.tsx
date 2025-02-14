import { useState } from 'react'
import { type Props } from '@astrojs/starlight/props'
import { type TocItem } from 'node_modules/@astrojs/starlight/utils/generateToC'
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerHeader,
  DrawerClose,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

const MobileSidebar = ({ toc }: Props) => {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)

  return (
    <div className="w-full border-y-[1px] px-6 py-3 backdrop-blur-md">
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <div className="flex flex-row items-center gap-6 bg-transparent">
          <Button
            variant="outline"
            onClick={() => setDrawerOpen(true)}>
            On this page <ChevronRight size={16} />
          </Button>
        </div>
        <DrawerContent className="mx-1 max-h-[70svh] border border-white/20 bg-gradient-to-br from-neutral-100 to-neutral-200 pb-12 dark:from-neutral-900 dark:to-neutral-950">
          <DrawerDescription></DrawerDescription>
          <DrawerHeader className="flex items-stretch justify-between gap-x-4 border-b border-black/5 px-1 py-0.5 dark:border-white/10">
            <DrawerTitle className="flex items-center justify-start px-3 text-sm text-neutral-700 dark:text-neutral-400">
              On this page
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
              {renderMenu(toc?.items ?? [], () =>
                setDrawerOpen(false),
              )}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

const renderMenu = (items: TocItem[], closeDrawer: () => void) => {
  return items.map((item, idx) => {
    if (item.children.length > 0) {
      return (
        <Group key={idx} item={item}>
          {renderMenu(item.children, closeDrawer)}
        </Group>
      )
    }
    return <Item key={idx} item={item} closeDrawer={closeDrawer} />
  })
}

interface GroupProps {
  item: TocItem
  children: React.ReactNode
}

const Group = ({ item, children }: GroupProps) => {
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
        <span className="font-medium capitalize">{item.text}</span>
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
  item: TocItem
  closeDrawer: () => void
}

const Item = ({ item, closeDrawer }: ItemProps) => {
  return (
    <Button
      asChild
      className="w-full cursor-pointer items-center justify-start bg-transparent capitalize text-primary hover:bg-transparent">
      <a
        href={`#${item.slug}`}
        onClick={closeDrawer}
        className="font-medium no-underline">
        {item.text}
      </a>
    </Button>
  )
}

export default MobileSidebar
