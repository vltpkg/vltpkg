import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  CornerDownRight,
  ListFilter,
  CircleDot,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipPortal,
} from '@/components/ui/tooltip.tsx'
import { labelClassNamesMap } from '@/components/explorer-grid/label-helper.ts'
import { useDependencySidebarStore } from '@/components/explorer-grid/dependency-sidebar/context.tsx'
import { cn } from '@/lib/utils.ts'
import { Kbd } from '@/components/ui/kbd.tsx'
import { dependencyFilters } from './filter-config.ts'

import type { DependencyTypeShort } from '@vltpkg/types'
import type { Filter } from './filter-config.ts'

const useDependencyFilters = () => {
  const filters = useDependencySidebarStore(state => state.filters)
  const setFilters = useDependencySidebarStore(
    state => state.setFilters,
  )
  const dependencies = useDependencySidebarStore(
    state => state.dependencies,
  )
  const setFilteredDependencies = useDependencySidebarStore(
    state => state.setFilteredDependencies,
  )

  const updateFilters = (newFilters: Filter[]) => {
    setFilters(newFilters)

    const filtered = dependencies.filter(dep => {
      const typeFilters = newFilters.filter(
        f => !f.startsWith('search:'),
      ) as DependencyTypeShort[]
      const searchFilters = newFilters.filter(f =>
        f.startsWith('search:'),
      )

      const matchesTypeFilter =
        typeFilters.length === 0 ||
        (dep.type && typeFilters.includes(dep.type))

      const matchesSearchFilter =
        searchFilters.length === 0 ||
        searchFilters.some(searchFilter => {
          const searchTerm = searchFilter
            .replace('search:', '')
            .toLowerCase()
          return dep.name.toLowerCase().includes(searchTerm)
        })

      return matchesTypeFilter && matchesSearchFilter
    })
    setFilteredDependencies(filtered)
  }

  const toggleFilter = (filter: Filter) => {
    const newFilters =
      filters.includes(filter) ?
        filters.filter(f => f !== filter)
      : [...filters, filter]
    updateFilters(newFilters)
  }

  const removeFilter = (filterToRemove: Filter) => {
    const newFilters = filters.filter(f => f !== filterToRemove)
    updateFilters(newFilters)
  }

  const addSearchFilter = (searchTerm: string) => {
    if (!searchTerm.trim()) return
    const searchFilter = `search:${searchTerm}` as Filter
    if (!filters.includes(searchFilter)) {
      updateFilters([...filters, searchFilter])
    }
  }

  return {
    filters,
    toggleFilter,
    removeFilter,
    addSearchFilter,
  }
}

export const FilterButton = () => {
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)
  const searchTerm = useDependencySidebarStore(
    state => state.searchTerm,
  )
  const setSearchTerm = useDependencySidebarStore(
    state => state.setSearchTerm,
  )

  const handleFilterOpenShortcut = (e: KeyboardEvent) => {
    if (e.key === 'f' && e.ctrlKey) {
      e.preventDefault()
      setDropdownOpen(prev => !prev)
    }
  }

  const handleDropdownOpenClose = () => {
    setDropdownOpen(prev => !prev)
    setSearchTerm('')
  }

  useEffect(() => {
    document.addEventListener('keydown', handleFilterOpenShortcut)

    return () =>
      document.removeEventListener(
        'keydown',
        handleFilterOpenShortcut,
      )
  }, [])

  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <DropdownMenu
          open={dropdownOpen}
          onOpenChange={handleDropdownOpenClose}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="aspect-square size-6 bg-white p-0 transition-colors dark:bg-black [&>svg]:size-4 [&>svg]:shrink-0"
                onClick={() => setDropdownOpen(true)}>
                <ListFilter />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>

          <TooltipPortal>
            <TooltipContent>Filter dependencies</TooltipContent>
          </TooltipPortal>

          <DropdownMenuContent
            align="end"
            className="w-[240px]"
            onCloseAutoFocus={e => e.preventDefault()}>
            <SearchInput setDropdownOpen={setDropdownOpen} />
            <AnimatePresence>
              {searchTerm ?
                <SearchFilterList />
              : <motion.div
                  initial={{ opacity: 0, filter: 'blur(2px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(2px)' }}
                  transition={{
                    ease: 'easeInOut',
                    duration: 0.2,
                  }}>
                  <DependencyFilters />
                </motion.div>
              }
            </AnimatePresence>
          </DropdownMenuContent>
        </DropdownMenu>
      </Tooltip>
    </TooltipProvider>
  )
}

const SearchFilterList = () => {
  const searchTerm = useDependencySidebarStore(
    state => state.searchTerm,
  )
  const { filters, toggleFilter, addSearchFilter } =
    useDependencyFilters()

  const matchingFilters = dependencyFilters.filter(filter =>
    filter.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && matchingFilters.length === 0) {
      addSearchFilter(searchTerm)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(2px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(2px)' }}
      transition={{
        ease: 'easeInOut',
        duration: 0.2,
      }}
      onKeyDown={handleKeyDown}>
      {matchingFilters.length > 0 ?
        <DropdownMenuGroup>
          {matchingFilters.map((filter, idx) => (
            <DropdownMenuItem
              key={`search-filter-${filter.name}-${idx}`}
              className="gap-2"
              onClick={() => toggleFilter(filter.name)}>
              <div
                className={cn(
                  'size-2 rounded-full',
                  labelClassNamesMap.get(filter.name),
                )}
              />
              {filter.name}
              {filters.includes(filter.name) && (
                <Check className="ml-auto size-4" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      : <div className="px-2 py-1.5 text-center text-sm text-muted-foreground">
          Press{' '}
          <Kbd className="inline-flex h-[20px] w-fit items-center justify-center gap-1 border-[1px] border-muted bg-white px-1 text-xxs dark:bg-black">
            Enter <CornerDownRight size={13} />
          </Kbd>{' '}
          to search for <br />
          <span className="text-foreground">"{searchTerm}"</span>
        </div>
      }
    </motion.div>
  )
}

const SearchInput = ({
  setDropdownOpen,
}: {
  setDropdownOpen: (dropdownOpen: boolean) => void
}) => {
  const searchTerm = useDependencySidebarStore(
    state => state.searchTerm,
  )
  const setSearchTerm = useDependencySidebarStore(
    state => state.setSearchTerm,
  )
  const { addSearchFilter } = useDependencyFilters()

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Enter') {
      addSearchFilter(searchTerm)
      setSearchTerm('')
      setDropdownOpen(false)
    }
  }

  return (
    <div className="relative pb-1.5">
      <div className="absolute left-[9px] z-[10] flex h-[30px] items-center justify-center">
        <Search className="text-neutral-500" size={14} />
      </div>
      <Input
        autoFocus
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        className="relative h-[30px] pl-[30px] pr-[70px] ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="Filter..."
      />
      <div className="absolute bottom-[6px] right-[5px] flex h-[30px] cursor-default items-center justify-center">
        <Kbd className="inline-flex h-[20px] w-fit items-center justify-center gap-1 border-[1px] border-muted bg-white px-1 text-xxs dark:bg-black">
          ctrl
        </Kbd>
        <Kbd className="inline-flex h-[20px] w-fit items-center justify-center gap-1 border-[1px] border-muted bg-white px-1 text-xxs dark:bg-black">
          F
        </Kbd>
      </div>
    </div>
  )
}

const DependencyFilters = () => {
  const { filters, toggleFilter } = useDependencyFilters()

  return (
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <CircleDot />
          Relationship
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent>
            {dependencyFilters.map((filter, idx) => (
              <DropdownMenuItem
                key={`filter-${filter.name}-${idx}`}
                className="gap-2"
                onClick={() => toggleFilter(filter.name)}
                tabIndex={idx + 1}>
                <div
                  className={cn(
                    'size-2 rounded-full',
                    labelClassNamesMap.get(filter.name),
                  )}
                />
                {filter.name}
                {filters.includes(filter.name) && (
                  <Check className="ml-auto size-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  )
}

export const FilterList = () => {
  const { filters, removeFilter } = useDependencyFilters()
  const hasFilters = filters.length > 0

  const getFilterLabel = (filter: Filter) => {
    if (filter.startsWith('search:')) {
      return `Search: ${filter.replace('search:', '')}`
    }
    return filter
  }

  const getFilterClassName = (filter: Filter) => {
    if (filter.startsWith('search:')) {
      return 'bg-blue-500/25 border-[1px] dark:border-blue-500 border-blue-600 text-blue-600 hover:bg-blue-500/40 dark:text-blue-400 dark:hover:bg-blue-500/40'
    }
    return labelClassNamesMap.get(filter as DependencyTypeShort)
  }

  return (
    <AnimatePresence initial={false} mode="sync">
      {hasFilters && (
        <motion.section
          initial={{
            opacity: 0,
            height: 0,
            filter: 'blur(2px)',
            marginBottom: 0,
          }}
          animate={{
            opacity: 1,
            height: 'auto',
            filter: 'blur(0px)',
            marginBottom: 16,
          }}
          exit={{
            opacity: 0,
            height: 0,
            filter: 'blur(2px)',
            marginBottom: 0,
          }}
          transition={{
            type: 'spring',
            duration: 0.28,
            bounce: 0.02,
          }}
          className="flex gap-2 overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            {filters.map((filter, idx) => (
              <motion.div
                key={`filter-${filter}-${idx}`}
                layout
                whileTap={{
                  scale: 0.95,
                }}
                initial={{
                  opacity: 0,
                  filter: 'blur(2px)',
                  scale: 0.9,
                }}
                animate={{
                  opacity: 1,
                  filter: 'blur(0px)',
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  filter: 'blur(2px)',
                  scale: 0.9,
                }}
                transition={{
                  type: 'spring',
                  duration: 0.2,
                  bounce: 0.01,
                }}
                style={{
                  originY: '0px',
                }}
                className="flex h-fit w-fit items-center justify-center">
                <Badge
                  variant="default"
                  className={cn(
                    'cursor-default',
                    getFilterClassName(filter),
                  )}
                  onClick={() => removeFilter(filter)}>
                  {getFilterLabel(filter)}
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
