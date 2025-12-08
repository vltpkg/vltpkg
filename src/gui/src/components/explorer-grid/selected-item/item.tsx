import { forwardRef, useRef, useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { JellyTriangleSpinner } from '@/components/ui/jelly-spinner.tsx'
import { PartialErrorsIndicator } from '@/components/explorer-grid/selected-item/partial-errors-indicator.tsx'
import {
  SelectedItemProvider,
  useTabNavigation,
  useSelectedItemStore,
  PRIMARY_TABS,
} from '@/components/explorer-grid/selected-item/context.tsx'
import {
  Navigation,
  NavigationButton,
  NavigationList,
  NavigationListItem,
} from '@/components/explorer-grid/selected-item/navigation.tsx'
import {
  PackageImageSpec,
  ItemBreadcrumbs,
  Publisher,
} from '@/components/explorer-grid/selected-item/item-header.tsx'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'
import type { MotionProps } from 'framer-motion'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { Tab } from '@/components/explorer-grid/selected-item/context.tsx'

interface ItemProps {
  item: GridItemData
  className?: string
}

const Section = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-background w-full rounded px-6 py-2 empty:hidden',
          className,
        )}
        {...props}
      />
    )
  },
)
Section.displayName = 'Section'

export const Item = ({ item, className }: ItemProps) => {
  return (
    <SelectedItemProvider key={item.id} selectedItem={item}>
      <ItemContent className={className} />
    </SelectedItemProvider>
  )
}

const ItemContent = ({ className }: { className?: string }) => {
  const isLoadingDetails = useSelectedItemStore(
    state => state.isLoadingDetails,
  )

  return (
    <section
      className={cn(
        'bg-foreground/6 relative flex min-w-0 flex-col gap-px rounded',
        className,
      )}>
      <AnimatePresence initial={false}>
        {isLoadingDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-background/80 absolute inset-0 z-11 flex items-center justify-center rounded backdrop-blur-sm">
            <JellyTriangleSpinner size={40} />
          </motion.div>
        )}
      </AnimatePresence>

      <PartialErrorsIndicator />

      <Section>
        <ItemBreadcrumbs />
      </Section>
      <Section className="py-4">
        <PackageImageSpec />
      </Section>
      <Section>
        <Publisher className="flex-col items-start lg:flex-row" />
      </Section>
      <Section className="p-0">
        <SelectedItemTabs />
      </Section>
      <Section className="h-full p-0">
        <SelectedItemView />
      </Section>
    </section>
  )
}

export const SelectedItemTabs = () => {
  const insights = useSelectedItemStore(state => state.insights)
  const versions = useSelectedItemStore(state => state.versions)
  const greaterVersions = useSelectedItemStore(
    state => state.greaterVersions,
  )
  const totalDependencies = useSelectedItemStore(
    state => state.depCount,
  )
  const listRef = useRef<HTMLUListElement>(null)
  const [isAtStart, setIsAtStart] = useState(true)
  const [isAtEnd, setIsAtEnd] = useState(false)

  const versionCount =
    (versions?.length ?? 0) + (greaterVersions?.length ?? 0) ||
    undefined

  const getCount = (tab: Tab) => {
    switch (tab) {
      case 'insights':
        return insights?.length || undefined
      case 'versions':
        return versionCount || undefined
      case 'dependencies':
        return totalDependencies || undefined
      default:
        return undefined
    }
  }

  useEffect(() => {
    const listElement = listRef.current
    if (!listElement) return

    const updateScrollState = () => {
      const { scrollLeft, scrollWidth, clientWidth } = listElement
      setIsAtStart(scrollLeft <= 0)
      setIsAtEnd(scrollLeft >= scrollWidth - clientWidth - 1) // -1 for rounding
    }

    // Initial check
    updateScrollState()

    // Listen to scroll events
    listElement.addEventListener('scroll', updateScrollState)

    // Listen to resize events (in case content changes)
    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(listElement)

    return () => {
      listElement.removeEventListener('scroll', updateScrollState)
      resizeObserver.disconnect()
    }
  }, [])

  // Use isAtStart and isAtEnd to check scroll position:
  // - isAtStart: true if user is at the beginning of the scroll area
  // - isAtEnd: true if user is at the end of the scroll area

  const scrollToStart = () => {
    const listElement = listRef.current
    if (listElement) {
      listElement.scrollTo({ left: 0, behavior: 'smooth' })
    }
  }

  const scrollToEnd = () => {
    const listElement = listRef.current
    if (listElement) {
      const { scrollWidth, clientWidth } = listElement
      listElement.scrollTo({
        left: scrollWidth - clientWidth,
        behavior: 'smooth',
      })
    }
  }

  return (
    <Navigation>
      <AnimatePresence>
        {!isAtStart && (
          <MotionScrollHelper
            align="start"
            onClick={scrollToStart}
            {...scrollHelperMotion}>
            <ChevronLeft />
          </MotionScrollHelper>
        )}
      </AnimatePresence>
      <NavigationList
        ref={listRef}
        isGrid={false}
        className="flex overflow-x-scroll [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(
          Object.entries(PRIMARY_TABS) as {
            [K in keyof typeof PRIMARY_TABS]-?: [
              K,
              (typeof PRIMARY_TABS)[K],
            ]
          }[keyof typeof PRIMARY_TABS][]
        ).map(([tab, label], idx) => (
          <NavigationListItem
            key={`focused-tabs-${tab}-${idx}`}
            className="min-w-[175px]">
            <NavigationButton
              navigationLayer="primary"
              tab={tab}
              count={getCount(tab)}
              className="min-w-[175px]">
              {label}
            </NavigationButton>
          </NavigationListItem>
        ))}
      </NavigationList>
      <AnimatePresence>
        {!isAtEnd && (
          <MotionScrollHelper
            align="end"
            onClick={scrollToEnd}
            {...scrollHelperMotion}>
            <ChevronRight />
          </MotionScrollHelper>
        )}
      </AnimatePresence>
    </Navigation>
  )
}

const scrollHelperMotion: MotionProps = {
  initial: { opacity: 0, filter: 'blur(2px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(2px)' },
}

const ScrollHelper = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof Button> & { align: 'start' | 'end' }
>(({ className, align, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      className={cn(
        'bg-background/50 absolute z-10 flex aspect-square h-full items-center justify-center rounded backdrop-blur-sm [&_svg]:size-4',
        align === 'start' && 'top-0 left-0',
        align === 'end' && 'top-0 right-0',
        className,
      )}
      {...props}
    />
  )
})
ScrollHelper.displayName = 'ScrollHelper'

const MotionScrollHelper = motion.create(ScrollHelper)

const SelectedItemView = () => {
  const { tab: activeTab } = useTabNavigation()
  return (
    <AnimatePresence initial={false} mode="wait">
      <Outlet key={activeTab} />
    </AnimatePresence>
  )
}
