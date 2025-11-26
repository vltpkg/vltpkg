import { Fragment, useLayoutEffect, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button.tsx'
import {
  Search as SearchIcon,
  Command as CommandIcon,
  Loader2,
  X as ClearIcon,
  FileQuestion,
  PackageSearch,
} from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandEmpty,
  CommandItem,
  CommandList,
  CommandGroup,
} from '@/components/ui/command.tsx'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty-state.tsx'
import { Kbd } from '@/components/ui/kbd.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { useSearchStore } from '@/state/search.ts'
import { useKeyDown } from '@/components/hooks/use-keydown.tsx'
import { useDebounce } from '@/components/hooks/use-debounce.tsx'
import { getPackageIcon } from '@/utils/get-package-icon.ts'
import { getPackageShortName } from '@/utils/get-package-shortname.ts'
import { cn } from '@/lib/utils.ts'

import type { ReactNode } from 'react'
import type { MotionProps } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import type { RegistryPackage } from '@/lib/package-search.ts'

/**
 * A template for the empty state that is reused across the
 * search command palette component.
 */
interface CommandEmptyStateProps {
  icon?: LucideIcon
  title?: string
  description?: string
  content?: ReactNode
  loader?: ReactNode
}

const CommandEmptyState = ({
  icon: Icon,
  title,
  description,
  content,
}: CommandEmptyStateProps) => {
  const hasHeaderContent = Icon ?? title ?? description

  return (
    <Empty>
      {hasHeaderContent && (
        <EmptyHeader>
          {Icon && (
            <EmptyMedia variant="icon">
              <Icon />
            </EmptyMedia>
          )}
          {title && <EmptyTitle>{title}</EmptyTitle>}
          {description && (
            <EmptyDescription className="whitespace-pre-wrap">
              {description}
            </EmptyDescription>
          )}
        </EmptyHeader>
      )}
      {content && <EmptyContent>{content}</EmptyContent>}
    </Empty>
  )
}

/**
 * The search palette
 */
const searchSectionMotion: MotionProps = {
  initial: {
    opacity: 0,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    filter: 'blur(4px)',
  },
  transition: {
    duration: 0.1,
    ease: 'easeOut',
  },
}

const MotionCommandList = motion.create(CommandList)

export const Search = ({ className }: { className?: string }) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState<boolean>(false)
  const [commandValue, setCommandValue] = useState<string>(
    '__no_selection__',
  )
  const searchTerm = useSearchStore(state => state.searchTerm)
  const setSearchTerm = useSearchStore(state => state.setSearchTerm)
  const performSearch = useSearchStore(state => state.performSearch)
  const searchResults = useSearchStore(state => state.searchResults)
  const isLoading = useSearchStore(state => state.isLoading)

  // command+k to open the search modal
  useKeyDown(['meta+k', 'ctrl+k'], () => setOpen(open => !open))
  // shift+enter to search the full query
  useKeyDown('shift+enter', () => handleFullSearch())

  const handleFullSearch = () => {
    void navigate(`/search?q=${encodeURIComponent(searchTerm)}`)
    setSearchTerm('')
  }

  const handleSelect = (pkg: string) => {
    void navigate(`/explore/npm/${encodeURIComponent(pkg)}`)
    setSearchTerm('')
  }

  // Debounce the search term by 300ms
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Track if we're in the debouncing phase (user is still typing)
  const isDebouncing = searchTerm !== debouncedSearchTerm

  // Perform the search when `debouncedSearchTerm` changes
  useEffect(() => {
    void performSearch(debouncedSearchTerm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm])

  // Reset command value when search results change to prevent auto-selection
  useLayoutEffect(() => {
    setCommandValue('__no_selection__')
  }, [searchResults])

  // Also reset when dialog opens
  useLayoutEffect(() => {
    if (open) {
      setCommandValue('__no_selection__')
    }
  }, [open])

  return (
    <Fragment>
      <button
        onClick={() => setOpen(open => !open)}
        className={cn(
          'hover:bg-foreground/3 inline-flex h-9 w-[300px] cursor-pointer items-center rounded-full border pr-3 pl-0.5 text-sm font-medium transition-colors duration-100',
          className,
        )}>
        <span className="flex size-8 items-center justify-center [&_svg]:size-4">
          <SearchIcon />
        </span>
        <span>Search</span>
        <div className="ml-auto inline-flex gap-1">
          <Kbd>
            <CommandIcon />
          </Kbd>
          <Kbd>k</Kbd>
        </div>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        showCloseButton={false}
        isLoading={isLoading}
        data-empty={searchResults.length !== 0}
        className="dark:bg-popover rounded-2xl border-1 border-neutral-100/60 bg-neutral-100 p-0.5 ring-2 ring-white dark:border-neutral-800/60 dark:ring-neutral-950 [&_[data-slot=command]]:rounded-[calc(1rem-2px)]"
        classNames={{
          command:
            'border dark:border-neutral-800 bg-white [&_[data-slot=command-input-wrapper]]:rounded-2xl [&_[data-slot=command-input-wrapper]]:border-b-0 dark:bg-neutral-900',
        }}
        commandProps={{
          value: commandValue,
          onValueChange: setCommandValue,
          shouldFilter: false,
          disablePointerSelection: false,
        }}>
        <div>
          <CommandInput
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder="Search for packages"
            loadingIcon={Loader2}
            autoFocus
          />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {(
            searchResults.length > 0 &&
            !isLoading &&
            !isDebouncing &&
            searchTerm.trim() !== ''
          ) ?
            <MotionCommandList
              key="search-results-list"
              onPointerLeave={() =>
                setCommandValue('__no_selection__')
              }
              className={cn(
                'mb-1',
                searchResults.length > 0 && 'h-[300px]',
              )}
              {...searchSectionMotion}>
              {/* Hidden item to prevent auto-selection */}
              <CommandItem
                value="__no_selection__"
                onSelect={() => handleFullSearch()}
                className="pointer-events-none absolute h-0 w-0 overflow-hidden p-0 opacity-0"
                aria-hidden="true"
              />

              {searchResults.length === 0 &&
                searchTerm.trim() !== '' && (
                  <CommandEmpty>
                    <CommandEmptyState
                      icon={FileQuestion}
                      title="No packages found"
                      description={`We couldn't find any packages for\n${searchTerm}\nTry refining your search.`}
                      content={
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSearchTerm('')}>
                          <ClearIcon />
                          <span>Clear search</span>
                        </Button>
                      }
                    />
                  </CommandEmpty>
                )}

              {searchResults.length > 0 && (
                <CommandGroup>
                  {searchResults.map((item, idx) => (
                    <SearchResultItem
                      onSelect={handleSelect}
                      item={item}
                      key={`search-result-${idx}`}
                    />
                  ))}
                </CommandGroup>
              )}
            </MotionCommandList>
          : <motion.div
              key="search-results-list-empty-state"
              className="flex h-[304px] items-center justify-center"
              {...searchSectionMotion}>
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <PackageSearch className="text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle className="text-muted-foreground text-sm">
                    Start typing to search
                  </EmptyTitle>
                  <EmptyDescription></EmptyDescription>
                </EmptyHeader>
              </Empty>
            </motion.div>
          }
        </AnimatePresence>
      </CommandDialog>
    </Fragment>
  )
}

/**
 * The search result package item that appears
 * in the search command palette
 */

interface SearchResultItemProps {
  item: {
    package: RegistryPackage
  }
  onSelect: (packageName: string) => void
}

const packageImageMotion: MotionProps = {
  initial: {
    opacity: 0,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    filter: 'blur(4px)',
  },
  transition: {
    duration: 0.1,
    ease: 'easeOut',
  },
}

const SearchResultItem = ({
  item,
  onSelect,
}: SearchResultItemProps) => {
  const [imageLoaded, setImageLoaded] = useState<boolean>(false)
  const packageIcon = getPackageIcon(item.package.links.repository)

  const packageShortName = getPackageShortName(item.package.name)

  return (
    <CommandItem
      aria-label="Package link"
      value={item.package.name}
      className="flex w-[488px] max-w-[488px] flex-col items-start rounded-[calc(1rem-0.25rem)] !py-1"
      onSelect={() => onSelect(item.package.name)}>
      <div className="flex w-full items-start gap-2">
        <AnimatePresence mode="popLayout">
          {packageIcon?.src ?
            <div className="relative size-9 rounded-lg border">
              <AnimatePresence mode="popLayout">
                {!imageLoaded && (
                  <motion.div
                    key="qs-package-skeleton"
                    {...packageImageMotion}
                    className="absolute inset-0 flex items-center justify-center">
                    <Skeleton className="h-full w-full" />
                  </motion.div>
                )}

                <motion.img
                  key="qa-package-image"
                  {...packageImageMotion}
                  aria-label="Package image"
                  onLoad={() => setImageLoaded(true)}
                  src={packageIcon.src}
                  alt={packageIcon.alt}
                  className="absolute inset-0 size-full rounded-lg object-cover"
                />
              </AnimatePresence>
            </div>
          : <div className="flex aspect-square size-9 items-center justify-center rounded-lg border bg-gradient-to-tr from-neutral-300 to-neutral-100 dark:from-neutral-900 dark:to-neutral-700">
              <span className="bg-gradient-to-tr from-neutral-500 to-neutral-900 bg-clip-text text-lg text-transparent empty:hidden dark:from-neutral-400 dark:to-neutral-100">
                {packageShortName}
              </span>
            </div>
          }
        </AnimatePresence>
        <div className="flex w-full min-w-0 flex-col">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <p
              aria-label="Package name"
              className="text-md min-w-0 flex-1 truncate font-medium tracking-tight">
              {item.package.name}
            </p>
            <span
              className="text-muted-foreground shrink-0 font-mono text-xs whitespace-nowrap tabular-nums"
              aria-label="Package version">{`v${item.package.version}`}</span>
          </div>
          <p className="text-muted-foreground truncate text-sm font-medium">
            {item.package.description}
          </p>
        </div>
      </div>
    </CommandItem>
  )
}
