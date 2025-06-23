import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  CornerDownRight,
  ListFilter,
  CircleDot,
  Search,
  RotateCcw,
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

export const useDependencyFilters = () => {
  const filters = useDependencySidebarStore(state => state.filters)
  const setFilters = useDependencySidebarStore(
    state => state.setFilters,
  )

  const toggleFilter = useCallback(
    (filter: Filter) => {
      const newFilters =
        filters.includes(filter) ?
          filters.filter((f: Filter) => f !== filter)
        : [...filters, filter]
      setFilters(newFilters)
    },
    [filters, setFilters],
  )

  const removeFilter = useCallback(
    (filterToRemove: Filter) => {
      const newFilters = filters.filter(
        (f: Filter) => f !== filterToRemove,
      )
      setFilters(newFilters)
    },
    [filters, setFilters],
  )

  const addSearchFilter = useCallback(
    (searchTerm: string) => {
      const trimmed = searchTerm.trim()
      if (!trimmed) return

      const searchFilter = `search:${trimmed}` as Filter
      if (!filters.includes(searchFilter)) {
        setFilters([...filters, searchFilter])
      }
    },
    [filters, setFilters],
  )

  const clearFilters = useCallback(() => {
    setFilters([])
  }, [setFilters])

  return {
    filters,
    toggleFilter,
    removeFilter,
    addSearchFilter,
    clearFilters,
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
    <AnimatePresence initial={false} mode="popLayout">
      {hasFilters && (
        <motion.section
          layout
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
          className="flex flex-wrap gap-2 overflow-hidden">
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

interface SimpleDependency {
  name: string
  spec: string
  version: string
}

const EmptyStateDependency = ({
  name,
  spec,
  version,
  className,
}: SimpleDependency & { className?: string }) => {
  return (
    <div
      className={cn(
        'h-12 w-64 rounded-lg border border-muted bg-muted/60',
        className,
      )}>
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-6 max-w-12 items-center justify-center truncate rounded border-[1px] border-muted-foreground/20 bg-muted-foreground/20 px-2 font-mono text-xxs tabular-nums text-muted-foreground/60">
            {spec}
          </div>
          <div className="text-xs font-medium text-muted-foreground/60">
            {name}
          </div>
        </div>
        <div className="font-mono text-xxs tabular-nums text-muted-foreground/60">
          v{version}
        </div>
      </div>
    </div>
  )
}

export const FilterListEmptyState = () => {
  const filteredDependencies = useDependencySidebarStore(
    state => state.filteredDependencies,
  )
  const dependencies = useDependencySidebarStore(
    state => state.dependencies,
  )
  const filters = useDependencySidebarStore(state => state.filters)
  const { clearFilters } = useDependencyFilters()

  const fillerDependencies: SimpleDependency[] = [
    {
      spec: '^21.0.0',
      name: 'tap',
      version: '21.1.0',
    },
    {
      spec: '^1.0.0',
      name: 'reproduce',
      version: '1.1.4',
    },
  ]

  const dependenciesUi: SimpleDependency[] = [
    ...fillerDependencies.slice(0, 3 - dependencies.length),
    ...dependencies.map(dep => ({
      name: dep.name,
      spec: String(dep.spec?.semver ?? '^1.0.0'),
      version: String(dep.version),
    })),
  ].splice(0, 3)

  const handleClear = () => clearFilters()

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {filters.length > 0 && filteredDependencies.length === 0 && (
        <motion.div
          layout
          initial={{ opacity: 0, filter: 'blur(2px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(2px)' }}
          transition={{
            ease: 'easeInOut',
            duration: 0.25,
          }}
          className="flex min-h-96 w-full cursor-default flex-col items-center justify-center gap-4 rounded-sm border-[1px] border-dashed border-muted py-12">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="relative space-y-2">
                {dependenciesUi.map((dep, idx) => (
                  <EmptyStateDependency
                    key={`${dep.name}-${idx}`}
                    {...dep}
                    className={cn(
                      idx === 0 && 'rotate-1 transform opacity-40',
                      idx === 1 &&
                        '-mt-10 -rotate-1 transform opacity-40',
                      idx === 2 && 'relative z-10 -mt-10 opacity-50',
                    )}
                  />
                ))}
              </div>

              <div className="pointer-events-none absolute inset-0 rounded-lg bg-background/30" />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <h3 className="text-base font-medium tracking-tight text-foreground">
              No matching dependencies
            </h3>
            <p className="w-4/5 text-sm font-normal tracking-normal text-muted-foreground">
              There were no dependencies matching your current
              filters.
            </p>
            <Button
              onClick={handleClear}
              className="mt-2 h-8 w-fit border-[1px] border-muted">
              <RotateCcw />
              Clear Filters
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
