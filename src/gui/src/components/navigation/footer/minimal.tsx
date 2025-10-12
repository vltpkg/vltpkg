import { useLocation } from 'react-router'
import { ThemeSwitcher } from '@/components/ui/theme-switcher.tsx'
import { useSearchResultsStore } from '@/state/search-results.ts'
import { SearchResultsPaginationNavigation } from '@/components/search/search-results/page-navigation.tsx'
import { SearchResultPageOptions } from '@/components/search/search-results/page-options.tsx'
import { cn } from '@/lib/utils.ts'

import { Fragment } from 'react'
import type { ComponentProps } from 'react'

type MinimalFooterProps = ComponentProps<'footer'>

export const MinimalFooter = ({
  className,
  ...rest
}: MinimalFooterProps) => {
  const { pathname } = useLocation()
  const total = useSearchResultsStore(state => state.total)
  const isLoading = useSearchResultsStore(state => state.isLoading)
  const isSearchRoute = pathname === '/search'

  const displaySearchPagination =
    isSearchRoute && total !== 0 && !isLoading

  return (
    <footer
      className={cn(
        'flex flex-col items-start gap-4 px-4 py-6 md:grid md:grid-cols-12 md:items-center',
        className,
      )}
      {...rest}>
      {displaySearchPagination && (
        <Fragment>
          <SearchResultPageOptions className="col-span-3" />
          <SearchResultsPaginationNavigation className="col-span-6 col-start-4" />
        </Fragment>
      )}
      <div
        className={cn(
          'col-span-3 flex items-center justify-end',
          !displaySearchPagination && 'col-span-full',
        )}>
        <ThemeSwitcher />
      </div>
    </footer>
  )
}
