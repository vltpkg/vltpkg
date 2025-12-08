import { forwardRef, Children, useRef, useCallback } from 'react'
import { useTabNavigation } from '@/components/explorer-grid/selected-item/context.tsx'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { toHumanNumber } from '@/utils/human-number.ts'
import { cn } from '@/lib/utils.ts'

import type { ComponentProps, CSSProperties } from 'react'
import type {
  Tab,
  SubTabDependencies,
} from '@/components/explorer-grid/selected-item/context.tsx'

const Navigation = forwardRef<HTMLDivElement, ComponentProps<'nav'>>(
  ({ className, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn('relative', className)}
        {...props}
      />
    )
  },
)
Navigation.displayName = 'Navigation'

const NavigationList = forwardRef<
  HTMLUListElement,
  ComponentProps<'ul'> & {
    isGrid?: boolean
  }
>(({ className, isGrid = true, ...props }, ref) => {
  const count = Children.count(props.children)

  return (
    <ul
      ref={ref}
      className={cn(
        'bg-foreground/6 gap-[1px] rounded p-0',
        isGrid &&
          'grid grid-cols-1 lg:[grid-template-columns:repeat(var(--count),minmax(0,1fr))]',
        className,
      )}
      style={{ '--count': count } as CSSProperties}
      {...props}
    />
  )
})
NavigationList.displayName = 'NavigationList'

const NavigationListItem = forwardRef<
  HTMLLIElement,
  ComponentProps<'li'>
>(({ className, ...props }, ref) => {
  return (
    <li
      ref={ref}
      className={cn(
        'bg-background flex items-center justify-center rounded',
        className,
      )}
      {...props}
    />
  )
})
NavigationListItem.displayName = 'NavigationListItem'

const NavigationButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<'button'> & {
    tab: Tab | SubTabDependencies
    navigationLayer: 'primary' | 'secondary'
    count?: number
  }
>(
  (
    { className, tab, navigationLayer, children, count, ...props },
    ref,
  ) => {
    const {
      setActiveTab,
      tab: activeTab,
      subTab: activeSubTab,
      setActiveSubTab,
    } = useTabNavigation()
    const currentTabRef = useRef<Tab>(activeTab)
    const currentSubTabRef = useRef<SubTabDependencies | undefined>(
      activeSubTab,
    )

    if (currentTabRef.current !== activeTab) {
      currentTabRef.current = activeTab
    }

    if (currentSubTabRef.current !== activeSubTab) {
      currentSubTabRef.current = activeSubTab
    }

    const handleTabChange = useCallback(
      (tab: string) => {
        const newTab = tab as Tab
        if (currentTabRef.current !== newTab) {
          currentTabRef.current = newTab
          setActiveTab(newTab)
        }
      },
      [setActiveTab],
    )

    const handleSubTabChange = useCallback(
      (subTab: string) => {
        const newSubTab = subTab as SubTabDependencies
        if (currentSubTabRef.current !== newSubTab) {
          currentSubTabRef.current = newSubTab
          setActiveSubTab(newSubTab)
        }
      },
      [setActiveSubTab],
    )

    return (
      <button
        ref={ref}
        className={cn(
          'text-muted-foreground hover:text-foreground hover:bg-foreground/6 bg-background inline-flex h-full w-full cursor-pointer items-center justify-center rounded px-6 py-3 text-sm font-medium capitalize transition-colors duration-100',
          navigationLayer === 'primary' &&
            activeTab === tab &&
            'bg-foreground/9 text-foreground',
          navigationLayer === 'secondary' &&
            activeSubTab === tab &&
            'bg-foreground/9 text-foreground',
          className,
        )}
        onClick={() =>
          navigationLayer === 'primary' ?
            handleTabChange(tab)
          : handleSubTabChange(tab)
        }
        {...props}>
        {children}
        {count && (
          <DataBadge
            variant="count"
            classNames={{ wrapperClassName: 'ml-2' }}
            content={toHumanNumber(count)}
          />
        )}
      </button>
    )
  },
)
NavigationButton.displayName = 'NavigationButton'

export {
  Navigation,
  NavigationList,
  NavigationListItem,
  NavigationButton,
}
