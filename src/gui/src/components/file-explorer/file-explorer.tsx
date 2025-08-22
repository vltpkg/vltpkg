import * as React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils.ts'
import { tv } from 'tailwind-variants'

import { Button } from '@/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu.tsx'
import {
  ScrollArea,
  ScrollBar,
} from '@/components/ui/scroll-area.tsx'
import {
  ViewOptions as FileExplorerListViewOptions,
  TableList,
} from '@/components/file-explorer/table-list.tsx'
import { Input } from '@/components/ui/input.tsx'

import { Sidebar } from '@/components/icons/index.ts'
import {
  ChevronRight,
  Folder,
  FolderSearch,
  Frown,
  LayoutGrid,
  List,
  Search,
} from 'lucide-react'
import { getIcon } from '@/components/file-explorer/utils.ts'

import type { VariantProps } from 'tailwind-variants'
import type { LucideIcon } from 'lucide-react'
import type { VisibilityState } from '@tanstack/react-table'

export type FileType = 'file' | 'directory' | 'other'
export interface FileExplorerItem {
  name: string
  path: string
  type: FileType
  size: number
  mtime: string
}

type FileExplorerView = 'list' | 'grid'

interface FileExplorerContextValue {
  isOpen: boolean
  view: FileExplorerView
  setIsOpen: React.Dispatch<
    React.SetStateAction<FileExplorerContextValue['isOpen']>
  >
  setView: React.Dispatch<
    React.SetStateAction<FileExplorerContextValue['view']>
  >
  asideVisible: boolean
  setAsideVisible: React.Dispatch<
    React.SetStateAction<FileExplorerContextValue['asideVisible']>
  >
  listColumnVisibility: VisibilityState
  setListColumnVisibility: React.Dispatch<
    React.SetStateAction<VisibilityState>
  >
  showHiddenItems: boolean
  setShowHiddenItems: React.Dispatch<React.SetStateAction<boolean>>
  searchValue: string
  setSearchValue: React.Dispatch<React.SetStateAction<string>>
  currentPath?: string
  setCurrentPath: React.Dispatch<
    React.SetStateAction<string | undefined>
  >
  backStack: (string | undefined)[]
  setBackStack: React.Dispatch<
    React.SetStateAction<(string | undefined)[]>
  >
  forwardStack: (string | undefined)[]
  setForwardStack: React.Dispatch<
    React.SetStateAction<(string | undefined)[]>
  >
  selectedItem: FileExplorerItem | null
  setSelectedItem: React.Dispatch<
    React.SetStateAction<FileExplorerItem | null>
  >
  enterDirectory: (item: FileExplorerItem) => void
  goBack: () => void
  goForward: () => void
  expandPathRequest: { path: string; recursive: boolean } | null
  setExpandPathRequest: React.Dispatch<
    React.SetStateAction<{ path: string; recursive: boolean } | null>
  >
  activeAsideRootPath: string | null
  setActiveAsideRootPath: React.Dispatch<
    React.SetStateAction<string | null>
  >
}

const FileExplorerContext =
  React.createContext<FileExplorerContextValue | null>(null)

const useFileExplorerContext = () => {
  const context = React.useContext(FileExplorerContext)
  if (!context) {
    throw new Error(
      'useFileExplorerContext must be used within a FileExplorerProvider',
    )
  }
  return context
}

const FileExplorer = ({
  isOpen: controlledOpen,
  setIsOpen: setControlledOpen,
  currentPath: controlledCurrentPath,
  onPathChange,
  ...props
}: React.PropsWithChildren & {
  isOpen?: boolean
  setIsOpen?: React.Dispatch<React.SetStateAction<boolean>>
  currentPath?: string
  onPathChange?: (next?: string) => void
  initialView?: FileExplorerView
}) => {
  const [isOpen, setIsOpen] = React.useState<boolean>(false)
  const [view, setView] = React.useState<FileExplorerView>(
    props.initialView ?? 'grid',
  )
  const [asideVisible, setAsideVisible] =
    React.useState<boolean>(true)
  const [listColumnVisibility, setListColumnVisibility] =
    React.useState<VisibilityState>({
      name: true,
      modified: true,
      size: true,
      kind: true,
    })
  const [showHiddenItems, setShowHiddenItems] =
    React.useState<boolean>(false)
  const [searchValue, setSearchValue] = React.useState<string>('')
  const [internalCurrentPath, setInternalCurrentPath] =
    React.useState<string | undefined>(undefined)
  const [backStack, setBackStack] = React.useState<
    (string | undefined)[]
  >([])
  const [forwardStack, setForwardStack] = React.useState<
    (string | undefined)[]
  >([])
  const [selectedItem, setSelectedItem] =
    React.useState<FileExplorerItem | null>(null)
  const [expandPathRequest, setExpandPathRequest] = React.useState<{
    path: string
    recursive: boolean
  } | null>(null)
  const [activeAsideRootPath, setActiveAsideRootPath] =
    React.useState<string | null>(null)

  const currentPath = controlledCurrentPath ?? internalCurrentPath

  const setCurrentPath = React.useCallback<
    React.Dispatch<React.SetStateAction<string | undefined>>
  >(
    value => {
      const base = controlledCurrentPath ?? internalCurrentPath
      let nextValue: string | undefined
      if (typeof value === 'function') {
        const updater = value as (
          prevState: string | undefined,
        ) => string | undefined
        nextValue = updater(base)
      } else {
        nextValue = value
      }

      if (controlledCurrentPath !== undefined) {
        if (onPathChange) onPathChange(nextValue)
      } else {
        setInternalCurrentPath(nextValue)
        if (onPathChange) onPathChange(nextValue)
      }
    },
    [onPathChange, controlledCurrentPath, internalCurrentPath],
  )

  const enterDirectory = React.useCallback(
    (item: FileExplorerItem) => {
      if (item.type !== 'directory') return
      setBackStack([...backStack, currentPath])
      setCurrentPath(item.path)
      setSelectedItem(null)
      // clear forward stack when navigating to a new directory
      setForwardStack([])
    },
    [currentPath, setCurrentPath, backStack],
  )

  const goBack = React.useCallback(() => {
    if (backStack.length === 0) return
    const previousPath = backStack[backStack.length - 1]
    const nextBack = backStack.slice(0, -1)
    setBackStack(nextBack)
    setCurrentPath(previousPath)
    setForwardStack([...forwardStack, currentPath])
    setSelectedItem(null)
  }, [backStack, forwardStack, currentPath, setCurrentPath])

  const goForward = React.useCallback(() => {
    if (forwardStack.length === 0) return
    const nextPath = forwardStack[forwardStack.length - 1]
    const nextForward = forwardStack.slice(0, -1)
    setForwardStack(nextForward)
    setBackStack([...backStack, currentPath])
    setCurrentPath(nextPath)
    setSelectedItem(null)
  }, [forwardStack, backStack, currentPath, setCurrentPath])

  React.useEffect(() => {
    // clear selection whenever directory changes
    setSelectedItem(null)
  }, [currentPath])

  React.useEffect(() => {
    // reset search when navigating directories
    setSearchValue('')
  }, [currentPath])

  return (
    <FileExplorerContext.Provider
      value={{
        isOpen: controlledOpen ?? isOpen,
        setIsOpen: setControlledOpen ?? setIsOpen,
        view,
        setView,
        asideVisible,
        setAsideVisible,
        listColumnVisibility,
        setListColumnVisibility,
        showHiddenItems,
        setShowHiddenItems,
        searchValue,
        setSearchValue,
        currentPath,
        setCurrentPath,
        backStack,
        setBackStack,
        forwardStack,
        setForwardStack,
        selectedItem,
        setSelectedItem,
        enterDirectory,
        goBack,
        goForward,
        expandPathRequest,
        setExpandPathRequest,
        activeAsideRootPath,
        setActiveAsideRootPath,
      }}
      {...props}>
      {props.children}
    </FileExplorerContext.Provider>
  )
}
FileExplorer.displayName = 'FileExplorer'

const FileExplorerViewChanger = () => {
  const { view, setView } = useFileExplorerContext()

  const views: { view: FileExplorerView; icon: LucideIcon }[] = [
    { view: 'grid', icon: LayoutGrid },
    { view: 'list', icon: List },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <FileExplorerButton
          variant="default"
          className="h-8 w-fit min-w-fit border-transparent text-neutral-500 hover:border-muted hover:bg-transparent hover:text-foreground [&>.chevron]:data-[state=open]:rotate-90">
          {view === 'grid' ?
            <LayoutGrid />
          : <List />}
          <ChevronRight className="chevron duration-250 transition-transform" />
        </FileExplorerButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent onCloseAutoFocus={e => e.preventDefault()}>
        <DropdownMenuLabel>Select view</DropdownMenuLabel>
        <DropdownMenuGroup>
          {views.map(({ view, icon: Icon }, idx) => (
            <DropdownMenuItem
              onSelect={() => setView(view)}
              key={`${view}-${idx}`}>
              <Icon />
              <span>{view}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
FileExplorerViewChanger.displayName = 'FileExplorerViewChanger'

const FileExplorerContent = React.forwardRef<
  HTMLDivElement,
  React.PropsWithChildren & { className?: string }
>(({ className, children, ...props }, ref) => {
  const { isOpen, setIsOpen } = useFileExplorerContext()
  return createPortal(
    <AnimatePresence initial={false} mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <motion.div
            ref={ref}
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{
              ease: 'easeInOut',
            }}
            className={cn(
              'relative z-[51] flex h-[600px] max-h-[600px] min-h-0 w-[900px] flex-col justify-between rounded-xl bg-background shadow-sm dark:border dark:border-muted dark:bg-neutral-950',
              className,
            )}
            {...props}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
})
FileExplorerContent.displayName = 'FileExplorerContent'

const FileExplorerTrigger = React.forwardRef<
  HTMLButtonElement,
  VariantProps<typeof fileExplorerButtonVariants> &
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ ...props }, ref) => {
  const { setIsOpen } = useFileExplorerContext()
  const handleOpen = () => setIsOpen(true)
  return (
    <FileExplorerButton
      ref={ref}
      onClick={handleOpen}
      className="hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:border-neutral-800 dark:hover:bg-neutral-900"
      {...props}
    />
  )
})
FileExplorerTrigger.displayName = 'FileExplorerTrigger'

const fileExplorerButtonVariants = tv({
  variants: {
    variant: {
      default:
        'rounded-lg font-normal w-full px-2 transition-colors duration-250 hover:bg-accent dark:hover:bg-accent min-w-36 text-foreground h-10 border bg-transparent dark:bg-transparent',
      icon: 'transition-colors h-8 duration-250 border border-transparent hover:border-muted rounded-lg bg-transparent dark:bg-transparent hover:bg-transparent dark:hover:bg-transparent aspect-square p-0 [&>svg]:size-4 hover:text-foreground text-neutral-500',
      cancel:
        'font-normal transition-colors rounded-lg duration-250 dark:bg-neutral-500 dark:hover:bg-neutral-400 bg-neutral-200 hover:bg-neutral-300 text-foreground h-8',
      action:
        'font-normal h-8 dark:hover:bg-blue-400 bg-blue-500 hover:bg-blue-600 rounded-lg',
      item: 'transition-colors duration-250 justify-start text-neutral-500 min-w-full w-full h-8 rounded-lg bg-transparent hover:text-foreground hover:bg-neutral-200 dark:bg-transparent dark:hover:bg-transparent',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

const FileExplorerButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof fileExplorerButtonVariants>
>(({ className, variant, ...props }, ref) => {
  const buttonClasses = fileExplorerButtonVariants({ variant })
  return (
    <Button
      ref={ref}
      className={cn(buttonClasses, className)}
      {...props}
    />
  )
})
FileExplorerButton.displayName = 'FileExplorerButton'

const FileExplorerHeader = React.forwardRef<
  HTMLDivElement,
  React.PropsWithChildren & { className?: string }
>(({ className, ...props }, ref) => (
  <div
    className={cn(
      'grid grid-cols-12 items-center border-b border-muted px-2 py-2',
      className,
    )}
    ref={ref}
    {...props}
  />
))
FileExplorerHeader.displayName = 'FileExplorerHeader'

const FileExplorerFooter = React.forwardRef<
  HTMLDivElement,
  React.PropsWithChildren & { className?: string }
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'grid grid-cols-12 items-center border-t border-muted px-4 py-3',
      className,
    )}
    {...props}>
    {children}
  </div>
))
FileExplorerFooter.displayName = 'FileExplorerFooter'

const FileExplorerMain = React.forwardRef<
  HTMLDivElement,
  React.PropsWithChildren & { className?: string }
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'grid h-full min-h-0 w-full grow grid-cols-12',
        className,
      )}
      {...props}>
      {children}
    </div>
  )
})
FileExplorerMain.displayName = 'FileExplorerMain'

const FileExplorerAsideToggle = ({
  className,
}: {
  className?: string
}) => {
  const { asideVisible, setAsideVisible } = useFileExplorerContext()
  const handleToggle = () => setAsideVisible(!asideVisible)
  return (
    <FileExplorerButton
      onClick={handleToggle}
      variant="icon"
      className={cn(className)}>
      <Sidebar />
    </FileExplorerButton>
  )
}
FileExplorerAsideToggle.displayName = 'FileExplorerAsideToggle'

const FileExplorerAside = React.forwardRef<
  HTMLDivElement,
  React.PropsWithChildren & { className?: string }
>(({ className, children }, ref) => {
  const { asideVisible } = useFileExplorerContext()
  return (
    <aside
      ref={ref}
      className={cn(
        'col-span-3 h-full min-h-0 flex-col gap-1 border-r border-muted bg-neutral-100 px-1.5 py-2 pr-2 dark:bg-neutral-900',
        asideVisible ? 'flex' : 'hidden',
        className,
      )}>
      <ScrollArea
        className="h-full"
        scrollBarThumbClassName="bg-neutral-500">
        {children}
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </aside>
  )
})
FileExplorerAside.displayName = 'FileExplorerAside'

const FileExplorerAsideItem = ({
  children,
  className,
  onClick,
}: React.PropsWithChildren & {
  className?: string
  onClick?: () => void
}) => {
  return (
    <FileExplorerButton
      onClick={onClick}
      variant="item"
      className={cn(className)}>
      {children}
    </FileExplorerButton>
  )
}
FileExplorerAsideItem.displayName = 'FileExplorerAsideItem'

const FileExplorerMainContent = ({
  items,
  loadChildren,
  ...props
}: {
  items: FileExplorerItem[]
  loadChildren?: (path: string) => Promise<FileExplorerItem[]>
}) => {
  const { asideVisible, view, showHiddenItems, searchValue } =
    useFileExplorerContext()

  const filteredItems = React.useMemo(() => {
    const base =
      showHiddenItems ? items : (
        items.filter(item => !item.name.startsWith('.'))
      )
    const q = searchValue.trim().toLowerCase()
    if (!q) return base
    return base.filter(item => item.name.toLowerCase().includes(q))
  }, [items, showHiddenItems, searchValue])

  return (
    <div
      className={cn(
        'col-span-full grid h-full min-h-0',
        asideVisible ? 'col-start-4' : 'col-start-0',
      )}>
      <ScrollArea
        className={cn(
          'h-full',
          '[&>[data-radix-scroll-area-viewport]>div:first-child]:h-full', // we do this to override the height of `scroll-area`'s internal div wrapper here to set the height
        )}
        scrollBarThumbClassName="bg-neutral-500">
        {filteredItems.length === 0 ?
          <div className="flex h-full w-full items-center justify-center p-4 text-sm text-muted-foreground">
            {searchValue.trim() ?
              <div className="flex h-full w-full flex-col items-center justify-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <Frown className="size-10 text-muted-foreground" />
                    <div className="absolute size-16 h-16 w-16 rounded-full border border-muted/70 bg-muted/60" />
                  </div>
                  <div className="mt-2 flex flex-col items-center justify-center text-center">
                    <p className="text-sm font-medium text-foreground">
                      No items matching:
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {searchValue.trim()}
                    </p>
                  </div>
                </div>
              </div>
            : <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-sm text-muted-foreground">
                <div className="relative flex items-center justify-center">
                  <Frown className="size-10 text-muted-foreground" />
                  <div className="absolute size-16 h-16 w-16 rounded-full border border-muted/70 bg-muted/60" />
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">
                  No items to display
                </p>
              </div>
            }
          </div>
        : <>
            {view === 'grid' && (
              <FileExplorerGridView
                items={filteredItems}
                {...props}
              />
            )}
            {view === 'list' && (
              <TableList
                items={filteredItems}
                loadChildren={async (path: string) =>
                  loadChildren ?
                    loadChildren(path)
                  : Promise.resolve([])
                }
              />
            )}
          </>
        }
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  )
}
FileExplorerMainContent.displayName = 'FileExplorerMainContent'

const FileExplorerGridView = ({
  items,
  className,
}: {
  items: FileExplorerItem[]
  className?: string
}) => {
  const { setSelectedItem, enterDirectory } = useFileExplorerContext()
  return (
    <div className="overflow-hidden overflow-y-scroll">
      <div
        className={cn(
          'col-span-12 grid grid-cols-12 gap-2 p-2',
          className,
        )}>
        {items.map((item, idx) => (
          <FileExplorerGridItem
            {...item}
            key={idx}
            onClick={() => setSelectedItem(item)}
            onDoubleClick={() => enterDirectory(item)}
          />
        ))}
      </div>
    </div>
  )
}
FileExplorerGridView.displayName = 'FileExplorerGridView'

const FileExplorerGridItem = ({
  className,
  name,
  type,
  onClick,
  onDoubleClick,
}: FileExplorerItem & {
  className?: string
  onClick?: () => void
  onDoubleClick?: () => void
}) => {
  const { selectedItem } = useFileExplorerContext()
  const isSelected =
    selectedItem != null &&
    selectedItem.name === name &&
    selectedItem.type === type
  const Icon = getIcon(type)
  return (
    <div
      className={cn(
        'duration-250 group col-span-3 flex cursor-default select-none flex-col items-center justify-center gap-1 rounded-lg p-2',
        isSelected ?
          'bg-neutral-200 dark:bg-neutral-900'
        : 'bg-transparent',
        className,
      )}
      onClick={onClick}
      onDoubleClick={onDoubleClick}>
      <div className="duration-250 flex items-center justify-center rounded-lg p-1 transition-colors group-hover:bg-neutral-200 dark:group-hover:bg-neutral-900 [&>svg]:size-20">
        <Icon
          className={cn(
            '',
            type === 'directory' &&
              'fill-blue-300 text-blue-300 dark:fill-blue-500 dark:text-blue-500',
            type === 'file' &&
              'fill-blue-300 text-blue-300 dark:fill-blue-500 dark:text-blue-500',
          )}
        />
      </div>
      <div className="flex items-center justify-center">
        <p
          className={cn(
            'text-wrap break-all text-center text-sm font-normal',
            isSelected ?
              'rounded bg-blue-300 px-1 text-white dark:bg-blue-500'
            : 'text-foreground',
          )}>
          {name}
        </p>
      </div>
    </div>
  )
}
FileExplorerGridItem.displayName = 'FileExplorerGridItem'

const FileExplorerSearch = () => {
  const { searchValue, setSearchValue } = useFileExplorerContext()
  const [focused, setFocused] = React.useState<boolean>(false)
  const [inputHasFocus, setInputHasFocus] =
    React.useState<boolean>(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    const handleKeyPresses = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const hasQuery = searchValue.trim().length > 0
        inputRef.current?.blur()
        setInputHasFocus(false)
        setFocused(hasQuery)
      }
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setFocused(true)
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
        setInputHasFocus(true)
      }
      if (e.key === 'Enter' && focused) {
        const hasQuery = searchValue.trim().length > 0
        if (!hasQuery) {
          inputRef.current?.blur()
          setFocused(false)
        }
        // if there is a query, do nothing; keep open but don't force focus
      }
    }
    window.addEventListener('keydown', handleKeyPresses)
    return () => {
      window.removeEventListener('keydown', handleKeyPresses)
    }
  }, [focused, searchValue])

  // ensure the search stays visually focused while a query exists
  React.useEffect(() => {
    const hasQuery = searchValue.trim().length > 0
    setFocused(hasQuery ? true : focused)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  return (
    <AnimatePresence initial={false}>
      {!focused && (
        <motion.div
          initial={{ opacity: 1, width: 32, filter: 'blur(0px)' }}
          animate={{ opacity: 1, width: 32, filter: 'blur(0px)' }}
          exit={{ opacity: 0, width: 0, filter: 'blur(0px)' }}
          transition={{ type: 'spring', bounce: 0.1, duration: 0.3 }}>
          <FileExplorerButton
            onClick={() => setFocused(true)}
            variant="icon">
            <Search />
          </FileExplorerButton>
        </motion.div>
      )}
      {focused && (
        <motion.div
          initial={{ opacity: 0, width: 0, filter: 'blur(2px)' }}
          animate={{ opacity: 1, width: 192, filter: 'blur(0px)' }}
          exit={{ opacity: 0, width: 0, filter: 'blur(2px)' }}
          transition={{ type: 'spring', bounce: 0.1, duration: 0.3 }}
          className={cn(
            'relative h-8 overflow-hidden rounded-lg border border-muted',
            inputHasFocus &&
              'outline outline-2 outline-offset-1 outline-blue-300',
          )}>
          <div className="flex items-center justify-center">
            <Search className="absolute inset-0 left-2 my-auto size-4 text-muted-foreground" />
          </div>
          <Input
            autoFocus={true}
            onFocus={() => setInputHasFocus(true)}
            onBlur={() => {
              setInputHasFocus(false)
              const hasQuery = searchValue.trim().length > 0
              setFocused(hasQuery)
            }}
            ref={inputRef}
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            placeholder="Search"
            className={cn(
              'h-8 w-48 rounded-lg border-transparent bg-transparent pl-8 pr-2 text-sm dark:border-transparent dark:bg-transparent',
              '!ring-offset-0 focus-visible:!ring-0',
            )}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
FileExplorerSearch.displayName = 'FileExplorerSearch'

const FileExplorerNavButtons = () => {
  const { goBack, goForward, backStack, forwardStack } =
    useFileExplorerContext()
  return (
    <>
      <FileExplorerButton
        variant="icon"
        onClick={() => goBack()}
        disabled={backStack.length === 0}>
        <ChevronRight className="rotate-180" />
      </FileExplorerButton>
      <FileExplorerButton
        variant="icon"
        onClick={() => goForward()}
        disabled={forwardStack.length === 0}>
        <ChevronRight />
      </FileExplorerButton>
    </>
  )
}

const FileExplorerHeaderTitle = () => {
  const { currentPath, searchValue } = useFileExplorerContext()
  const query = searchValue.trim()
  return (
    <h1 className="truncate text-sm font-medium text-neutral-500">
      {query ?
        <>
          Search:
          <span className="ml-1 text-muted-foreground">{query}</span>
        </>
      : currentPath ?
        currentPath.split('/').pop()
      : 'Select a directory'}
    </h1>
  )
}

const FileExplorerCancel = ({
  onCancel,
}: {
  onCancel?: () => void
}) => {
  const { setIsOpen } = useFileExplorerContext()
  return (
    <FileExplorerButton
      variant="cancel"
      onClick={() => (onCancel ? onCancel() : setIsOpen(false))}>
      Cancel
    </FileExplorerButton>
  )
}

const FileExplorerFooterSelect = ({
  onSelect,
}: {
  onSelect?: (item: FileExplorerItem) => void
}) => {
  const { selectedItem } = useFileExplorerContext()
  const disabled = !(
    selectedItem && selectedItem.type === 'directory'
  )
  return (
    <FileExplorerButton
      variant="action"
      disabled={disabled}
      onClick={() => {
        if (!selectedItem || selectedItem.type !== 'directory') return
        onSelect?.(selectedItem)
      }}>
      Select
    </FileExplorerButton>
  )
}

const ActiveAsideRootSync = ({
  rootDirs,
}: {
  rootDirs: FileExplorerItem[]
}) => {
  const { currentPath, setActiveAsideRootPath } =
    useFileExplorerContext()
  React.useEffect(() => {
    if (rootDirs.length === 0) {
      setActiveAsideRootPath(null)
      return
    }
    if (!currentPath) {
      setActiveAsideRootPath(null)
      return
    }
    const match = rootDirs.find(dir =>
      currentPath.startsWith(dir.path),
    )
    setActiveAsideRootPath(match ? match.path : null)
  }, [currentPath, rootDirs, setActiveAsideRootPath])
  return null
}

const FileExplorerAsideRootItem = ({
  item,
}: {
  item: FileExplorerItem
}) => {
  const {
    view,
    setCurrentPath,
    setExpandPathRequest,
    activeAsideRootPath,
    setActiveAsideRootPath,
  } = useFileExplorerContext()
  const isActive =
    !!activeAsideRootPath && item.path.startsWith(activeAsideRootPath)
  const handleClick = () => {
    if (view === 'grid') {
      setCurrentPath(item.path)
      setActiveAsideRootPath(item.path)
    } else {
      setCurrentPath(undefined)
      setExpandPathRequest({ path: item.path, recursive: true })
      setActiveAsideRootPath(item.path)
    }
  }
  return (
    <FileExplorerAsideItem
      onClick={handleClick}
      className={cn(
        'hover:text-foreground dark:hover:bg-neutral-800 dark:hover:text-white',
        isActive &&
          'bg-blue-400 text-white hover:bg-blue-500 hover:text-white dark:bg-neutral-800 dark:hover:bg-neutral-700',
      )}>
      <Folder />
      <span>{item.name}</span>
    </FileExplorerAsideItem>
  )
}

const FileExplorerDialog = ({
  items = [],
  rootDirs = [],
  isOpen,
  setIsOpen,
  currentPath,
  onPathChange,
  onCancel,
  onSelect,
  loadChildren,
  initialView,
}: {
  items?: FileExplorerItem[]
  rootDirs?: FileExplorerItem[]
  isOpen?: boolean
  setIsOpen?: React.Dispatch<React.SetStateAction<boolean>>
  currentPath?: string
  onPathChange?: (next?: string) => void
  onCancel?: () => void
  onSelect?: (item: FileExplorerItem) => void
  loadChildren?: (path: string) => Promise<FileExplorerItem[]>
  initialView?: FileExplorerView
}) => {
  return (
    <FileExplorer
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      currentPath={currentPath}
      onPathChange={onPathChange}
      initialView={initialView}>
      <ActiveAsideRootSync rootDirs={rootDirs} />
      <FileExplorerTrigger>
        <FolderSearch />
        <span>Select Directory</span>
      </FileExplorerTrigger>
      <FileExplorerContent>
        <FileExplorerHeader>
          <div className="col-span-4 flex items-center justify-start gap-2">
            <FileExplorerNavButtons />
            <FileExplorerAsideToggle />
            <FileExplorerViewChanger />
            <FileExplorerListViewOptions />
          </div>
          <div className="col-span-4 flex items-center justify-center">
            <FileExplorerHeaderTitle />
          </div>
          <div className="col-span-4 flex items-center justify-end">
            <FileExplorerSearch />
          </div>
        </FileExplorerHeader>

        <FileExplorerMain>
          <FileExplorerAside>
            {rootDirs.map((item, idx) => (
              <React.Fragment key={idx}>
                <FileExplorerAsideRootItem item={item} />
                {idx < rootDirs.length - 1 && (
                  <div className="h-[1px] w-full rounded-full bg-muted" />
                )}
              </React.Fragment>
            ))}
          </FileExplorerAside>
          <FileExplorerMainContent
            items={items}
            loadChildren={loadChildren}
          />
        </FileExplorerMain>

        <FileExplorerFooter>
          <div className="col-span-6 flex items-center">
            <p className="text-sm text-neutral-500">
              <span className="font-mono">{items.length}</span> items
            </p>
          </div>
          <div className="col-span-6 col-start-7 flex items-center justify-end gap-2">
            <FileExplorerCancel onCancel={onCancel} />
            <FileExplorerFooterSelect onSelect={onSelect} />
          </div>
        </FileExplorerFooter>
      </FileExplorerContent>
    </FileExplorer>
  )
}

export {
  FileExplorerDialog,
  FileExplorer,
  FileExplorerTrigger,
  FileExplorerContent,
  FileExplorerHeader,
  FileExplorerFooter,
  FileExplorerMain,
  FileExplorerAside,
  FileExplorerAsideToggle,
  FileExplorerAsideItem,
  FileExplorerMainContent,
  FileExplorerGridView,
  FileExplorerGridItem,
  FileExplorerSearch,
  FileExplorerNavButtons,
  FileExplorerHeaderTitle,
  FileExplorerCancel,
  FileExplorerFooterSelect,
  FileExplorerViewChanger,
  useFileExplorerContext,
  FileExplorerButton,
  FileExplorerListViewOptions,
}
