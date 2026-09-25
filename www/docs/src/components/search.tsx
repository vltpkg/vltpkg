'use client'

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useRouter } from 'next/navigation'
import { Command as CommandPrimitive } from 'cmdk'
import {
  FileTextIcon,
  FolderIcon,
  HashIcon,
  LoaderCircleIcon,
  SearchIcon,
  TextIcon,
} from 'lucide-react'
import { useDocsSearch } from 'fumadocs-core/search/client'
import { fetchClient } from 'fumadocs-core/search/client/fetch'
import type { SortedResult } from 'fumadocs-core/search'
import { cn } from 'cn'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSidebar } from '@/components/ui/sidebar'

const client = fetchClient({ api: '/api/search' })
const icons = {
  page: FileTextIcon,
  heading: HashIcon,
  text: TextIcon,
}
const MAX_PAGES = 10

// the server returns results page-first, with that page's heading/text hits right after it
const byPage = (results: SortedResult[]) =>
  results.reduce<SortedResult[][]>((groups, result) => {
    if (result.type === 'page' || !groups.length)
      groups.push([result])
    else groups[groups.length - 1].push(result)
    return groups
  }, [])

// content is markdown with <mark> around matches; render as text, never as html
const Highlighted = ({ text }: { text: string }) =>
  text
    .replace(/`|\*\*/g, '')
    .split(/<mark>(.*?)<\/mark>/g)
    .map((part, i) =>
      i % 2 ?
        <mark key={i} className="text-foreground bg-transparent">
          {part}
        </mark>
      : part,
    )

// server renders the Mac glyph; other platforms swap to Ctrl after hydration
const useIsMac = () =>
  useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.userAgent),
    () => true,
  )

export const SearchTrigger = ({
  className,
  ...props
}: React.ComponentProps<'button'>) => {
  const mac = useIsMac()
  return (
    <button
      type="button"
      aria-keyshortcuts="Meta+K Control+K"
      className={cn(
        'bg-card text-muted-foreground hover:border-foreground/20 hover:text-sidebar-foreground focus-visible:ring-sidebar-ring flex h-9 w-full items-center gap-2 rounded-lg border px-3 text-sm outline-hidden transition-colors focus-visible:ring-2 [&_svg]:size-4',
        className,
      )}
      {...props}>
      <SearchIcon aria-hidden />
      Search documentation
      <kbd
        aria-hidden
        className="ml-auto flex h-5 items-center gap-1 rounded-md border px-1.5 font-sans text-xs pointer-coarse:hidden">
        {mac ? '⌘' : 'Ctrl'} K
      </kbd>
    </button>
  )
}

export type Suggestion = {
  name: React.ReactNode
  url: string
  folder?: boolean
}
export type SuggestionGroup = {
  name?: React.ReactNode
  links: Suggestion[]
}

type SearchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocus: React.RefObject<HTMLElement | null>
  // shown before anything is typed
  suggestions: SuggestionGroup[]
}

export const SearchDialog = ({
  open,
  onOpenChange,
  returnFocus,
  suggestions,
}: SearchDialogProps) => {
  const router = useRouter()
  const { setOpenMobile } = useSidebar()
  const { search, setSearch, query } = useDocsSearch({ client })
  const [selected, setSelected] = useState('')
  const navigated = useRef(false)
  const [shown, setShown] = useState(query.data)

  // results arrive after the keystroke, so cmdk can't auto-select them; select the top hit ourselves
  if (query.data !== shown) {
    setShown(query.data)
    setSelected(
      Array.isArray(query.data) ? (query.data[0]?.id ?? '') : '',
    )
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  const go = (url: string) => {
    navigated.current = true
    router.push(url)
    onOpenChange(false)
    setOpenMobile(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        // a softer zoom than the primitive's, and a plain fade out
        className="data-open:zoom-in-[0.98] motion-reduce:data-open:zoom-in-100 data-closed:fill-mode-forwards data-closed:zoom-out-100 top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 data-closed:ease-in data-open:duration-160 data-open:ease-[cubic-bezier(0.2,0.8,0.2,1)] sm:max-w-xl"
        onCloseAutoFocus={e => {
          // back to the trigger on dismiss; after navigating, leave focus to the new page
          e.preventDefault()
          if (!navigated.current) returnFocus.current?.focus()
          navigated.current = false
        }}>
        <DialogTitle className="sr-only">Search docs</DialogTitle>
        <DialogDescription className="sr-only">
          Search pages, headings and content.
        </DialogDescription>
        <Command
          shouldFilter={false}
          // with an empty query, highlight the first suggestion so Enter works straight away
          value={
            search ? selected : (
              selected || (suggestions[0]?.links[0]?.url ?? '')
            )
          }
          onValueChange={setSelected}
          className="rounded-none! bg-transparent p-0">
          <div className="text-muted-foreground flex h-12 items-center gap-3 px-4 [&_svg]:size-4 [&_svg]:shrink-0">
            <SearchIcon aria-hidden />
            <CommandPrimitive.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search documentation"
              className="md:text-body text-foreground placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent text-base outline-hidden"
            />
            {query.isLoading && (
              // appears only if a search outlasts 300ms, so fast responses never flash it
              <span
                role="status"
                className="animate-[view-fade_150ms_300ms_backwards]">
                <LoaderCircleIcon className="animate-spin" />
                <span className="sr-only">Searching</span>
              </span>
            )}
          </div>
          {!search && (
            <CommandList className="max-h-[min(26rem,60vh)] border-t p-2">
              {suggestions.map((group, i) => (
                <CommandGroup
                  key={i}
                  heading={group.name ?? 'Get started'}
                  className="p-0 not-first:mt-1 **:[[cmdk-group-heading]]:px-3">
                  {group.links.map(link => {
                    const Icon =
                      link.folder ? FolderIcon : FileTextIcon
                    return (
                      <CommandItem
                        key={link.url}
                        value={link.url}
                        onSelect={() => go(link.url)}
                        className="text-sidebar-foreground data-selected:bg-accent min-h-9 gap-2.5 px-3 text-(length:--text-body)">
                        <Icon
                          aria-hidden
                          className="text-muted-foreground"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {link.name}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          )}
          {search && (!!query.error || Array.isArray(query.data)) && (
            <CommandList className="max-h-[min(26rem,60vh)] border-t p-2">
              {query.error ?
                <p className="text-muted-foreground py-8 text-center text-sm">
                  Search is unavailable right now.
                </p>
              : <CommandEmpty className="text-muted-foreground py-8">
                  No results found.
                </CommandEmpty>
              }
              {Array.isArray(query.data) &&
                // ponytail: renders the top 10 pages only; add "show more" if people ask for deeper results
                byPage(query.data)
                  .slice(0, MAX_PAGES)
                  .map(group => (
                    <CommandGroup
                      key={group[0].id}
                      className="p-0 not-first:mt-1">
                      {group.map(result => {
                        const Icon = icons[result.type]
                        return (
                          <CommandItem
                            key={result.id}
                            value={result.id}
                            onSelect={() => go(result.url)}
                            className={cn(
                              'data-selected:bg-accent min-h-9 gap-2.5 px-3 text-(length:--text-body)',
                              result.type === 'page' ?
                                'text-sidebar-foreground'
                              : 'text-muted-foreground data-selected:text-foreground pl-9',
                            )}>
                            <Icon
                              aria-hidden
                              className="text-muted-foreground"
                            />
                            <span className="min-w-0 flex-1 truncate">
                              <Highlighted text={result.content} />
                            </span>
                            {result.type === 'page' &&
                              !!result.breadcrumbs?.length && (
                                <span className="text-muted-foreground max-w-[40%] truncate text-xs">
                                  {result.breadcrumbs.join(' / ')}
                                </span>
                              )}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  ))}
            </CommandList>
          )}
        </Command>
      </DialogContent>
    </Dialog>
  )
}
