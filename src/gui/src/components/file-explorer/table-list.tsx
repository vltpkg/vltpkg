import * as React from 'react'
import { cn } from '@/lib/utils.ts'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ColumnDef, Column } from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu.tsx'
import {
  Tooltip,
  TooltipPortal,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip.tsx'
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from 'lucide-react'
import { ViewOptions as ViewOptionsIcon } from '@/components/icons/index.ts'
import {
  FileExplorerButton,
  useFileExplorerContext,
} from '@/components/file-explorer/file-explorer.tsx'
import { getIcon } from '@/components/file-explorer/utils.ts'
import { format } from 'date-fns'
import { formatDownloadSize } from '@/utils/format-download-size.ts'

import type { FileExplorerItem } from '@/components/file-explorer/file-explorer.tsx'

export const ViewOptions = () => {
  const {
    listColumnVisibility,
    setListColumnVisibility,
    view,
    showHiddenItems,
    setShowHiddenItems,
  } = useFileExplorerContext()

  const toggleableColumnIds = ['size', 'modified', 'kind'] as const

  const handleToggle = (id: (typeof toggleableColumnIds)[number]) => {
    setListColumnVisibility(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <FileExplorerButton
          variant="default"
          className="h-8 w-fit min-w-fit border-transparent text-neutral-500 hover:border-muted hover:bg-transparent hover:text-foreground [&>.chevron]:data-[state=open]:rotate-90">
          <ViewOptionsIcon className="size-4 text-muted-foreground" />
          <ChevronRight className="chevron duration-250 transition-transform" />
        </FileExplorerButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent onCloseAutoFocus={e => e.preventDefault()}>
        <DropdownMenuLabel>View options</DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={e => {
            setShowHiddenItems(v => !v)
            e.preventDefault()
          }}
          className="flex gap-2">
          <div className="mr-2 aspect-square size-4">
            {showHiddenItems && <Check className="size-3" />}
          </div>
          <span>Hidden items</span>
        </DropdownMenuItem>
        {view === 'list' &&
          toggleableColumnIds.map(id => (
            <DropdownMenuItem
              key={id}
              onSelect={e => {
                handleToggle(id)
                e.preventDefault()
              }}
              className="flex gap-2">
              <div className="mr-2 aspect-square size-4">
                {listColumnVisibility[id] && (
                  <Check className="size-3" />
                )}
              </div>
              <span>
                {id === 'modified' ?
                  'Date modified'
                : id === 'kind' ?
                  'Kind'
                : 'Size'}
              </span>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const NameCellInner = ({
  item,
  canExpand,
  isExpanded,
  onToggle,
}: {
  item: FileExplorerItem
  canExpand: boolean
  isExpanded: boolean
  onToggle: (item: FileExplorerItem) => void
}) => {
  const Icon = getIcon(item.type, isExpanded)

  return (
    <>
      <div className="aspect-square size-4">
        {canExpand && (
          <button
            className="cursor-default p-0 text-neutral-500 hover:text-foreground"
            onClick={e => {
              e.stopPropagation()
              onToggle(item)
            }}
            title={isExpanded ? 'Collapse' : 'Expand'}>
            <div>
              {isExpanded ?
                <ChevronDown className="size-3" />
              : <ChevronRight className="size-3" />}
            </div>
          </button>
        )}
      </div>
      <div className="flex aspect-square size-4 items-center justify-center [&>svg]:size-4">
        <Icon />
      </div>
      <TooltipProvider>
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <span
              className={cn('max-w-[150px] cursor-default truncate')}>
              {item.name}
            </span>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent align="start">{item.name}</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>
    </>
  )
}

const NestedRows = ({
  items,
  level,
  onToggle,
  expandedPaths,
  childrenByPath,
  loadingPaths,
  showHiddenItems,
  searchValue,
  columnsCount,
  listColumnVisibility,
}: {
  items: FileExplorerItem[]
  level: number
  onToggle: (item: FileExplorerItem) => void
  expandedPaths: Set<string | undefined>
  childrenByPath: Record<string, FileExplorerItem[]>
  loadingPaths: Set<string | undefined>
  showHiddenItems: boolean
  searchValue: string
  columnsCount: number
  listColumnVisibility: Record<string, boolean>
}) => {
  const { setSelectedItem, selectedItem } = useFileExplorerContext()
  const query = searchValue.trim().toLowerCase()
  const filterItems = (arr: FileExplorerItem[]) =>
    arr
      .filter(i => (showHiddenItems ? true : !i.name.startsWith('.')))
      .filter(i =>
        !query ? true : i.name.toLowerCase().includes(query),
      )

  const visible = (col: 'modified' | 'size' | 'kind') =>
    listColumnVisibility[col] !== false

  return (
    <>
      {filterItems(items).map(item => {
        const isExpanded = expandedPaths.has(item.path)
        const canExpand = item.type === 'directory'
        const children = childrenByPath[item.path] ?? []
        const isSelected = selectedItem?.path === item.path
        return (
          <React.Fragment key={item.path}>
            <TableRow
              className={cn(
                'odd:bg-neutral-100 dark:odd:bg-neutral-900',
                isSelected &&
                  '!bg-blue-300 hover:!bg-blue-400 dark:!bg-blue-600 dark:hover:!bg-blue-500',
              )}
              onClick={() => setSelectedItem(item)}
              onDoubleClick={() => canExpand && onToggle(item)}>
              <TableCell className="px-2 py-1">
                <div
                  className={cn(
                    'flex items-center gap-2',
                    'min-w-0',
                  )}>
                  <div style={{ width: level * 12 }} />
                  <NameCellInner
                    item={item}
                    canExpand={canExpand}
                    isExpanded={isExpanded}
                    onToggle={onToggle}
                  />
                </div>
              </TableCell>
              {visible('modified') && (
                <TableCell className="px-2 py-1 text-sm text-muted-foreground">
                  <TooltipProvider>
                    <Tooltip delayDuration={150}>
                      <TooltipTrigger asChild>
                        <span className="w-fit max-w-[150px] cursor-default truncate">
                          {(() => {
                            const date = format(
                              item.mtime,
                              'MMM dd, yyyy',
                            )
                            const time = format(item.mtime, 'HH:mm')
                            return `${date} at ${time}`
                          })()}
                        </span>
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipContent align="start">
                          {format(item.mtime, 'yyyy-MM-dd HH:mm:ss')}
                        </TooltipContent>
                      </TooltipPortal>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              )}
              {visible('size') && (
                <TableCell className="px-2 py-1 text-sm text-muted-foreground">
                  {item.size === 0 || !item.size ?
                    '-'
                  : formatDownloadSize(item.size)}
                </TableCell>
              )}
              {visible('kind') && (
                <TableCell className="px-2 py-1 text-sm text-muted-foreground">
                  {item.type}
                </TableCell>
              )}
            </TableRow>
            {canExpand && isExpanded && (
              <NestedRows
                items={children}
                level={level + 1}
                onToggle={onToggle}
                expandedPaths={expandedPaths}
                childrenByPath={childrenByPath}
                loadingPaths={loadingPaths}
                showHiddenItems={showHiddenItems}
                searchValue={searchValue}
                columnsCount={columnsCount}
                listColumnVisibility={listColumnVisibility}
              />
            )}
          </React.Fragment>
        )
      })}
    </>
  )
}

const SortingHeader = <T,>({
  column,
  header,
  className,
}: {
  column: Column<T>
  header: string
  className?: string
}) => {
  return (
    <button
      className="inline-flex cursor-default items-center gap-1 [&>svg]:size-4"
      onClick={() =>
        column.toggleSorting(column.getIsSorted() === 'asc')
      }>
      {header}
      {column.getIsSorted() === 'asc' ?
        <ChevronUp className={className} />
      : <ChevronDown className={className} />}
    </button>
  )
}

export const TableList = ({
  items,
  loadChildren,
}: {
  items: FileExplorerItem[]
  loadChildren: (path: string) => Promise<FileExplorerItem[]>
}) => {
  const {
    listColumnVisibility,
    setListColumnVisibility,
    showHiddenItems,
    searchValue,
    setSelectedItem,
    selectedItem,
    view,
    expandPathRequest,
    setExpandPathRequest,
  } = useFileExplorerContext()

  const data = React.useMemo(() => {
    const base =
      showHiddenItems ? items : (
        items.filter(item => !item.name.startsWith('.'))
      )
    const q = searchValue.trim().toLowerCase()
    if (!q) return base
    return base.filter(item => item.name.toLowerCase().includes(q))
  }, [items, showHiddenItems, searchValue])

  const [expandedPaths, setExpandedPaths] = React.useState<
    Set<string | undefined>
  >(new Set())
  const [childrenByPath, setChildrenByPath] = React.useState<
    Record<string, FileExplorerItem[]>
  >({})
  const [loadingPaths, setLoadingPaths] = React.useState<
    Set<string | undefined>
  >(new Set())

  const toggleExpand = React.useCallback(
    async (item: FileExplorerItem) => {
      if (item.type !== 'directory') return
      const pathKey = item.path
      setExpandedPaths(prev => {
        const next = new Set(prev)
        if (next.has(pathKey)) next.delete(pathKey)
        else next.add(pathKey)
        return next
      })
      if (!childrenByPath[pathKey]) {
        setLoadingPaths(prev => new Set(prev).add(pathKey))
        try {
          const children = await loadChildren(pathKey)
          setChildrenByPath(prev => ({
            ...prev,
            [pathKey]: children,
          }))
        } finally {
          setLoadingPaths(prev => {
            const next = new Set(prev)
            next.delete(pathKey)
            return next
          })
        }
      }
    },
    [childrenByPath, loadChildren],
  )

  const columns: ColumnDef<FileExplorerItem>[] = [
    {
      id: 'name',
      header: ({ column }) => (
        <SortingHeader column={column} header="Name" />
      ),
      accessorKey: 'name',
      cell: ({ row }) => {
        const { type, path } = row.original
        const isExpanded = expandedPaths.has(path)
        const canExpand = type === 'directory'
        return (
          <div className="flex w-full cursor-default items-center gap-2">
            <NameCellInner
              item={row.original}
              canExpand={canExpand}
              isExpanded={isExpanded}
              onToggle={toggleExpand}
            />
          </div>
        )
      },
      size: 150,
      minSize: 150,
      maxSize: 150,
    },
    {
      id: 'modified',
      header: ({ column }) => (
        <SortingHeader column={column} header="Date Modified" />
      ),
      accessorKey: 'modified',
      cell: ({ row }) => {
        const { mtime } = row.original
        const date = format(mtime, 'MMM dd, yyyy')
        const time = format(mtime, 'HH:mm')
        return (
          <TooltipProvider>
            <Tooltip delayDuration={150}>
              <TooltipTrigger className="w-fit max-w-[150px] cursor-default truncate text-muted-foreground">
                {`${date} at ${time}`}
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent align="start">
                  {format(mtime, 'yyyy-MM-dd HH:mm:ss')}
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          </TooltipProvider>
        )
      },
      sortingFn: (a, b) => {
        return a.original.mtime > b.original.mtime ? -1 : 1
      },
      minSize: 150,
      size: 150,
      maxSize: 150,
    },
    {
      id: 'size',
      header: ({ column }) => (
        <SortingHeader column={column} header="Size" />
      ),
      accessorKey: 'size',
      cell: ({ row }) => {
        const { size } = row.original
        const formattedSize =
          size === 0 || !size ? '-' : formatDownloadSize(size)
        return (
          <p className="text-muted-foreground">{formattedSize}</p>
        )
      },
      minSize: 80,
      size: 80,
      maxSize: 80,
    },
    {
      id: 'kind',
      header: ({ column }) => (
        <SortingHeader column={column} header="Kind" />
      ),
      accessorKey: 'kind',
      cell: ({ row }) => {
        const { type } = row.original
        return <p className="text-muted-foreground">{type}</p>
      },
      sortingFn: (a, b) => {
        return a.original.type.localeCompare(b.original.type)
      },
      minSize: 100,
      size: 100,
      maxSize: 100,
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setListColumnVisibility,
    state: {
      columnVisibility: listColumnVisibility,
    },
  })

  // handle external requests to expand a specific path (e.g., from sidebar)
  React.useEffect(() => {
    if (!expandPathRequest) return
    if (view !== 'list') return
    const { path, recursive } = expandPathRequest

    const expandDirectoryTree = async (
      dirPath: string,
      doRecursive: boolean,
    ) => {
      // ensure expanded
      setExpandedPaths(prev => {
        const next = new Set(prev)
        next.add(dirPath)
        return next
      })
      // load children if absent
      let children = childrenByPath[dirPath]
      if (!children) {
        setLoadingPaths(prev => new Set(prev).add(dirPath))
        try {
          const loadedChildren = await loadChildren(dirPath)
          children = loadedChildren
          setChildrenByPath(prev => ({
            ...prev,
            [dirPath]: loadedChildren,
          }))
        } finally {
          setLoadingPaths(prev => {
            const next = new Set(prev)
            next.delete(dirPath)
            return next
          })
        }
      }
      if (doRecursive && children.length > 0) {
        for (const child of children) {
          if (child.type === 'directory') {
            await expandDirectoryTree(child.path, true)
          }
        }
      }
    }

    void (async () => {
      try {
        await expandDirectoryTree(path, recursive)
      } finally {
        setExpandPathRequest(null)
      }
    })()
  }, [
    childrenByPath,
    expandPathRequest,
    setExpandPathRequest,
    view,
    loadChildren,
  ])

  return (
    <Table className="relative" data-test-id="file-explorer-table">
      <TableHeader className="sticky top-0 z-10 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <TableHead
                key={header.id}
                className="h-fit px-2 py-1 align-middle"
                style={{
                  width: `${header.getSize()}px`,
                }}>
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>

      <TableBody>
        {table.getRowModel().rows.length ?
          table.getRowModel().rows.map(row => (
            <React.Fragment key={row.id}>
              <TableRow
                className={cn(
                  'odd:bg-neutral-100 dark:odd:bg-neutral-900',
                  selectedItem?.path === row.original.path &&
                    '!bg-blue-300 hover:!bg-blue-400 dark:!bg-blue-600 dark:hover:!bg-blue-500',
                )}
                data-test-id="file-explorer-row"
                onClick={() => setSelectedItem(row.original)}
                onDoubleClick={() =>
                  row.original.type === 'directory' &&
                  void toggleExpand(row.original)
                }>
                {row.getVisibleCells().map(cell => (
                  <TableCell
                    key={cell.id}
                    className="cursor-default px-2 py-1"
                    data-test-id="file-explorer-cell">
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </TableCell>
                ))}
              </TableRow>
              {expandedPaths.has(row.original.path) && (
                <>
                  {loadingPaths.has(row.original.path) ?
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="bg-neutral-100 px-2 py-1 text-sm text-muted-foreground"
                      />
                    </TableRow>
                  : <NestedRows
                      items={childrenByPath[row.original.path] ?? []}
                      level={1}
                      onToggle={toggleExpand}
                      expandedPaths={expandedPaths}
                      childrenByPath={childrenByPath}
                      loadingPaths={loadingPaths}
                      showHiddenItems={showHiddenItems}
                      searchValue={searchValue}
                      columnsCount={columns.length}
                      listColumnVisibility={listColumnVisibility}
                    />
                  }
                </>
              )}
            </React.Fragment>
          ))
        : <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        }
      </TableBody>
    </Table>
  )
}
