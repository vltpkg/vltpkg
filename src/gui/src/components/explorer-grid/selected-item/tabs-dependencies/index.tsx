import { forwardRef } from 'react'
import { Outlet } from 'react-router'
import {
  useTabNavigation,
  SECONDARY_TABS,
  useSelectedItemStore,
} from '@/components/explorer-grid/selected-item/context.tsx'
import {
  Navigation,
  NavigationButton,
  NavigationList,
  NavigationListItem,
} from '@/components/explorer-grid/selected-item/navigation.tsx'
import { AnimatePresence } from 'framer-motion'
import {
  contentMotion,
  MotionContent,
} from '@/components/explorer-grid/selected-item/helpers.tsx'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps } from 'react'
import type { SubTabDependencies } from '@/components/explorer-grid/selected-item/context.tsx'

const Section = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex h-full w-full p-[0.5px]', className)}
        {...props}>
        <div className="bg-background flex h-full w-full rounded">
          {children}
        </div>
      </div>
    )
  },
)

Section.displayName = 'Section'

export const DependenciesTabContent = () => {
  return (
    <MotionContent
      {...contentMotion}
      className="bg-background-secondary flex flex-col gap-px rounded">
      <DependenciesTabNavigation className="bg-background rounded" />
      <Section className="p-0">
        <DependenciesTabView />
      </Section>
    </MotionContent>
  )
}

const DependenciesTabNavigation = ({
  className,
  ...props
}: ComponentProps<typeof Navigation>) => {
  const { subTab: activeSubTab } = useTabNavigation()
  const depWarnings = useSelectedItemStore(state => state.depWarnings)
  const totalDepWarnings = Object.values(depWarnings ?? {}).reduce(
    (acc, warning) => acc + warning.count,
    0,
  )
  const depLicenses = useSelectedItemStore(state => state.depLicenses)
  const uniqueLicenses = Object.keys(
    depLicenses?.allLicenses ?? {},
  ).length
  const depFunding = useSelectedItemStore(state => state.depFunding)
  const fundingCount = Object.entries(depFunding ?? {}).reduce(
    (acc, [, { count }]) => acc + count,
    0,
  )
  const duplicatedDeps = useSelectedItemStore(
    state => state.duplicatedDeps,
  )
  const duplicatedDepCount = Object.values(
    duplicatedDeps ?? {},
  ).reduce((acc, { count }) => acc + (count > 1 ? 1 : 0), 0)

  const getCount = (subTab: SubTabDependencies) => {
    switch (subTab) {
      case 'insights':
        return totalDepWarnings || undefined
      case 'licenses':
        return uniqueLicenses || undefined
      case 'funding':
        return fundingCount || undefined
      case 'duplicates':
        return duplicatedDepCount || undefined
    }
  }

  return (
    <Navigation className={cn(className)} {...props}>
      <NavigationList>
        {(
          Object.entries(SECONDARY_TABS) as {
            [K in keyof typeof SECONDARY_TABS]-?: [
              K,
              (typeof SECONDARY_TABS)[K],
            ]
          }[keyof typeof SECONDARY_TABS][]
        ).map(([tab, label], idx) => (
          <NavigationListItem
            key={`focused-tabs-${activeSubTab}-${tab}-${idx}`}>
            <NavigationButton
              navigationLayer="secondary"
              tab={tab}
              count={getCount(tab)}>
              {label}
            </NavigationButton>
          </NavigationListItem>
        ))}
      </NavigationList>
    </Navigation>
  )
}

const DependenciesTabView = () => {
  const { subTab: activeSubTab } = useTabNavigation()

  return (
    <AnimatePresence initial={false} mode="wait">
      <Outlet key={activeSubTab} />
    </AnimatePresence>
  )
}
