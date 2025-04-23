import { useEffect, useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx'
import {
  History,
  ArrowUpDown,
  ChevronRight,
  Search,
  ListFilter,
  CircleHelp,
} from 'lucide-react'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.jsx'
import { InlineCode } from '@/components/ui/inline-code.jsx'
import { format, formatDistanceStrict } from 'date-fns'
import type { Version } from '@/lib/external-info.js'
import { cn } from '@/lib/utils.js'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@radix-ui/react-avatar'
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip.jsx'
import { Button } from '@/components/ui/button.jsx'
import { formatDownloadSize } from '@/utils/format-download-size.js'
import { Input } from '@/components/ui/input.jsx'
import { prerelease, lt } from '@vltpkg/semver'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu.jsx'
import type { ChartConfig } from '@/components/ui/chart.jsx'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart.jsx'
import { Bar, BarChart, XAxis, CartesianGrid } from 'recharts'

export const VersionsTabButton = () => {
  const versions = useSelectedItemStore(state => state.versions)
  const greaterVersions = useSelectedItemStore(
    state => state.greaterVersions,
  )

  const versionCount =
    (versions?.length ?? 0) + (greaterVersions?.length ?? 0)
  const hasVersions = versionCount > 0

  return (
    <TabsTrigger
      variant="ghost"
      value="versions"
      className="w-fit px-2">
      Versions
      {hasVersions && (
        <InlineCode
          variant="mono"
          className={cn(
            'ml-1 inline-flex h-[1.25rem] min-w-[1.25rem] items-center justify-center text-center',
          )}>
          {versionCount}
        </InlineCode>
      )}
    </TabsTrigger>
  )
}

const VersionHeader = ({
  items,
  setItems,
}: {
  items: VersionItem[]
  setItems: (items: VersionItem[]) => void
}) => {
  const [order, setOrder] = useState<{
    version: 'asc' | 'desc'
    unpackedSize: 'asc' | 'desc'
    publishedDate: 'asc' | 'desc'
    publisher: 'asc' | 'desc'
    downloadsPerVersion: 'asc' | 'desc'
  }>({
    version: 'asc',
    unpackedSize: 'asc',
    publishedDate: 'asc',
    publisher: 'asc',
    downloadsPerVersion: 'asc',
  })

  const sortItems = (
    key: keyof VersionItem,
    order: 'asc' | 'desc',
  ) => {
    setItems(
      [...items].sort((a, b) => {
        // Handle undefined values first
        if (a[key] === undefined && b[key] === undefined) return 0
        if (a[key] === undefined) return 1 // undefined values go to the end
        if (b[key] === undefined) return -1 // undefined values go to the end

        if (key === 'unpackedSize') {
          const aSize = a[key] ?? 0
          const bSize = b[key] ?? 0
          return order === 'asc' ? aSize - bSize : bSize - aSize
        }
        if (key === 'publishedDate') {
          const aDate = new Date(a[key]).getTime()
          const bDate = new Date(b[key]).getTime()
          return order === 'asc' ? aDate - bDate : bDate - aDate
        }
        if (key === 'publishedAuthor') {
          const aName = a.publishedAuthor?.name
          const bName = b.publishedAuthor?.name

          if (!aName || !bName) return 0

          const comparison = aName
            .toLowerCase()
            .localeCompare(bName.toLowerCase())
          return order === 'asc' ? comparison : -comparison
        }
        if (key === 'downloadsPerVersion') {
          const aDownloads = a.downloadsPerVersion ?? 0
          const bDownloads = b.downloadsPerVersion ?? 0
          return order === 'asc' ?
              aDownloads - bDownloads
            : bDownloads - aDownloads
        }
        return order === 'asc' ?
            a.version.localeCompare(b.version)
          : b.version.localeCompare(a.version)
      }),
    )
  }

  const onVersionClick = () => {
    const newOrder = order.version === 'asc' ? 'desc' : 'asc'
    setOrder(prev => ({ ...prev, version: newOrder }))
    sortItems('version', newOrder)
  }

  const onUnpackedSizeClick = () => {
    const newOrder = order.unpackedSize === 'asc' ? 'desc' : 'asc'
    setOrder(prev => ({ ...prev, unpackedSize: newOrder }))
    sortItems('unpackedSize', newOrder)
  }

  const onPublishedDateClick = () => {
    const newOrder = order.publishedDate === 'asc' ? 'desc' : 'asc'
    setOrder(prev => ({ ...prev, publishedDate: newOrder }))
    sortItems('publishedDate', newOrder)
  }

  const onDownloadsClick = () => {
    const newOrder =
      order.downloadsPerVersion === 'asc' ? 'desc' : 'asc'
    setOrder(prev => ({ ...prev, downloadsPerVersion: newOrder }))
    sortItems('downloadsPerVersion', newOrder)
  }

  const onPublisherClick = () => {
    const newOrder = order.publisher === 'asc' ? 'desc' : 'asc'
    setOrder(prev => ({ ...prev, publisher: newOrder }))
    sortItems('publishedAuthor', newOrder)
  }

  return (
    <div className="hidden cursor-default grid-cols-12 gap-3 pb-2 xl:grid">
      <div className="col-span-2 flex w-full items-center justify-center">
        <button
          onClick={onVersionClick}
          className="relative z-[1] inline-flex w-fit cursor-default items-center justify-center gap-2 text-nowrap text-sm text-muted-foreground transition-all duration-300 after:absolute after:left-[-0.75rem] after:z-[-1] after:h-[calc(100%+0.5rem)] after:w-[calc(100%+1.5rem)] after:rounded-sm after:bg-transparent after:content-[''] hover:text-foreground hover:after:bg-muted">
          <span>Version</span>
          <ArrowUpDown size={16} />
        </button>
      </div>
      <div className="col-span-2 ml-1 w-full text-center">
        <button
          onClick={onUnpackedSizeClick}
          className="relative z-[1] inline-flex w-fit cursor-default items-center justify-center gap-2 text-nowrap text-sm text-muted-foreground transition-all duration-300 after:absolute after:left-[-0.75rem] after:z-[-1] after:h-[calc(100%+0.5rem)] after:w-[calc(100%+1.5rem)] after:rounded-sm after:bg-transparent after:content-[''] hover:text-foreground hover:after:bg-muted">
          <span>Size</span>
          <ArrowUpDown size={16} />
        </button>
      </div>
      <div className="col-span-3 w-full text-center">
        <button
          onClick={onPublishedDateClick}
          className="relative z-[1] inline-flex w-fit cursor-default items-center justify-center gap-2 text-nowrap text-sm text-muted-foreground transition-all duration-300 after:absolute after:left-[-0.75rem] after:z-[-1] after:h-[calc(100%+0.5rem)] after:w-[calc(100%+1.5rem)] after:rounded-sm after:bg-transparent after:content-[''] hover:text-foreground hover:after:bg-muted">
          <span>Published Date</span>
          <ArrowUpDown size={16} />
        </button>
      </div>
      <div className="col-span-2 w-full text-center">
        <button
          onClick={onDownloadsClick}
          className="relative z-[1] inline-flex w-fit cursor-default items-center justify-center gap-2 text-nowrap text-sm text-muted-foreground transition-all duration-300 after:absolute after:left-[-0.75rem] after:z-[-1] after:h-[calc(100%+0.5rem)] after:w-[calc(100%+1.5rem)] after:rounded-sm after:bg-transparent after:content-[''] hover:text-foreground hover:after:bg-muted">
          <span>Downloads</span>
          <ArrowUpDown size={16} />
        </button>
      </div>
      <div className="col-span-3 flex w-full items-center justify-center text-center">
        <button
          onClick={onPublisherClick}
          className="relative z-[1] inline-flex w-fit cursor-default items-center justify-center gap-2 text-nowrap text-sm text-muted-foreground transition-all duration-300 after:absolute after:left-[-0.75rem] after:z-[-1] after:h-[calc(100%+0.5rem)] after:w-[calc(100%+1.5rem)] after:rounded-sm after:bg-transparent after:content-[''] hover:text-foreground hover:after:bg-muted">
          <span>Publisher</span>
          <ArrowUpDown size={16} />
        </button>
      </div>
    </div>
  )
}

interface VersionItem extends Version {
  downloadsPerVersion?: number
}

const VersionItem = ({
  versionInfo,
}: {
  versionInfo: VersionItem
}) => {
  const {
    version,
    unpackedSize,
    publishedAuthor,
    publishedDate,
    downloadsPerVersion,
  } = versionInfo

  return (
    <div className="group/item flex cursor-default grid-cols-12 flex-col gap-3 rounded-sm py-4 text-foreground transition-colors first:border-t-[0px] xl:grid xl:gap-3 xl:px-2 xl:py-1.5 xl:hover:bg-muted">
      <div className="order-1 col-span-2 flex w-full flex-col justify-center gap-1 xl:justify-center xl:gap-0">
        <p className="text-sm font-medium text-muted-foreground xl:hidden">
          Version
        </p>
        <InlineCode
          tooltipDuration={150}
          displayTooltip
          tooltip={version}
          className="mx-0 w-fit max-w-none truncate break-all text-sm xl:w-fit xl:max-w-[5.5rem]"
          variant="mono">
          {version}
        </InlineCode>
      </div>
      <div className="order-2 col-span-2 flex w-full flex-col gap-2 xl:items-center xl:justify-center xl:gap-0 xl:text-center">
        {unpackedSize && (
          <>
            <p className="text-sm font-medium text-muted-foreground xl:hidden">
              Size
            </p>
            <p className="font-mono text-sm">
              {formatDownloadSize(unpackedSize)}
            </p>
          </>
        )}
      </div>
      <div className="order-4 col-span-3 flex w-full flex-col gap-2 xl:order-3 xl:items-center xl:justify-center xl:gap-0 xl:text-center">
        {publishedDate && (
          <>
            <p className="text-sm font-medium text-muted-foreground xl:hidden">
              Published Date
            </p>
            <div className="flex gap-2 xl:hidden">
              <Avatar className="size-5">
                <AvatarImage
                  className="rounded-sm outline outline-[1px] outline-border"
                  src={publishedAuthor?.avatar}
                />
                {publishedAuthor?.avatar && (
                  <AvatarFallback className="h-5 h-full w-5 w-full rounded-sm bg-secondary bg-gradient-to-t from-neutral-100 to-neutral-400 px-[10px] outline outline-[1px] outline-border dark:from-neutral-500 dark:to-neutral-800" />
                )}
              </Avatar>
              <p className="col-span-4 font-mono text-sm">
                {publishedAuthor?.name}
              </p>
              <p className="ml-2 inline-flex font-mono text-sm text-muted-foreground xl:hidden">
                {formatDistanceStrict(publishedDate, new Date(), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="hidden cursor-default font-mono text-sm xl:inline-flex">
                  {formatDistanceStrict(publishedDate, new Date(), {
                    addSuffix: true,
                  })}
                </TooltipTrigger>
                <TooltipContent>
                  {format(publishedDate, 'MMMM do, yyyy | HH:mm:ss')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
      <div
        className={cn(
          'order-3 col-span-2 w-full flex-col justify-start gap-2 xl:items-center xl:justify-center xl:gap-0 xl:text-center',
          !downloadsPerVersion ? 'hidden xl:flex' : 'flex',
        )}>
        {downloadsPerVersion && (
          <>
            <p className="text-sm font-medium text-muted-foreground xl:hidden">
              Downloads
            </p>
            <p className="font-mono text-sm">
              {downloadsPerVersion.toLocaleString()}
            </p>
          </>
        )}
      </div>
      <div className="order-3 col-span-3 flex hidden w-full items-center justify-center xl:order-4 xl:flex">
        <div className="flex w-full items-center justify-center gap-2">
          <Avatar className="flex size-5 items-center justify-center">
            <AvatarImage
              className="rounded-sm outline outline-[1px] outline-border"
              src={publishedAuthor?.avatar}
            />
            {publishedAuthor?.avatar && (
              <AvatarFallback className="h-full w-full rounded-sm bg-secondary bg-gradient-to-t from-neutral-100 to-neutral-400 px-[10px] outline outline-[1px] outline-border dark:from-neutral-500 dark:to-neutral-800" />
            )}
          </Avatar>
          <TooltipProvider>
            <Tooltip delayDuration={150}>
              <TooltipTrigger className="cursor-default">
                <p className="truncate font-mono text-sm">
                  {publishedAuthor?.name}
                </p>
              </TooltipTrigger>
              <TooltipContent>{publishedAuthor?.name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}

const createIntersectionObserver = (
  callback: () => void,
  hasMore: boolean,
  rootMargin = '100px',
) => {
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      if (node) {
        observerRef.current = new IntersectionObserver(
          entries => {
            if (entries[0]?.isIntersecting && hasMore) {
              callback()
            }
          },
          { rootMargin },
        )
        observerRef.current.observe(node)
      }
    },
    [hasMore, callback, rootMargin],
  )
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-full min-h-64 w-full items-center justify-center overflow-hidden">
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <div className="relative flex size-32 items-center justify-center rounded-full bg-secondary/60">
        <History
          className="absolute z-[4] size-14 text-neutral-500"
          strokeWidth={1.25}
        />
      </div>
      <div className="flex w-2/3 flex-col items-center justify-center gap-1 break-all text-center">
        <p className="w-full text-pretty text-sm text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  </div>
)

const DownloadGraph = () => {
  const manifest = useSelectedItemStore(state => state.manifest)
  const downloadsLastYear = useSelectedItemStore(
    state => state.downloadsLastYear,
  )

  if (!downloadsLastYear || !manifest?.version) return null

  const chartConfig = {
    downloads: {
      label: 'Downloads',
      color: 'oklch(var(--chart-1))',
    },
  } satisfies ChartConfig

  const downloadsPerMonth = Object.entries(
    downloadsLastYear.downloads.reduce<Record<string, number>>(
      (acc, { downloads, day }) => {
        const month = day.slice(0, 7)
        acc[month] = (acc[month] || 0) + downloads
        return acc
      },
      {},
    ),
  ).map(([month, downloads]) => ({ month, downloads }))

  const totalDownloads = downloadsPerMonth.reduce(
    (acc, { downloads }) => acc + downloads,
    0,
  )

  return (
    <div className="mb-3 border-b-[1px] border-muted pb-1">
      <div className="flex cursor-default justify-between">
        <div className="flex flex-col gap-0.5">
          <TooltipProvider>
            <h3 className="inline-flex items-center gap-1 align-baseline text-base font-medium text-foreground">
              Package Downloads
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default text-muted-foreground">
                    <CircleHelp strokeWidth={2} size={16} />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="font-normal">
                  Downloads across all package versions
                </TooltipContent>
              </Tooltip>
            </h3>
          </TooltipProvider>
          <p className="font-mono text-xs text-muted-foreground">
            {totalDownloads.toLocaleString()}
          </p>
        </div>
        <p className="align-baseline text-sm text-muted-foreground">
          {format(downloadsLastYear.start, 'MMMM yyyy')}
          {' - '}
          {format(downloadsLastYear.end, 'MMMM yyyy')}
        </p>
      </div>
      <ChartContainer
        config={chartConfig}
        className="h-[200px] w-full">
        <BarChart accessibilityLayer data={downloadsPerMonth}>
          <CartesianGrid vertical={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                indicator="line"
                className="w-[200px]"
                labelFormatter={value => {
                  return format(value as string, 'MMMM, yyyy')
                }}
              />
            }
          />
          <Bar
            dataKey="downloads"
            fill="var(--color-downloads)"
            radius={4}
          />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={value => {
              return format(value as string, 'MMM')
            }}
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}

export const VersionsTabContent = () => {
  const manifest = useSelectedItemStore(state => state.manifest)
  const versions = useSelectedItemStore(state => state.versions)
  const downloadsPerVersion = useSelectedItemStore(
    state => state.downloadsPerVersion,
  )

  const [filteredVersions, setFilteredVersions] = useState<
    VersionItem[]
  >([])
  const [page, setPage] = useState(1)
  const [greaterPage, setGreaterPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [showPreReleases, setShowPreReleases] = useState(true)
  const [showNewerVersions, setShowNewerVersions] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const ITEMS_PER_PAGE = 20

  const activeFilters = [
    {
      id: 'pre-releases',
      label: 'Hide pre-releases',
      isActive: !showPreReleases,
      onToggle: (checked: boolean) => setShowPreReleases(!checked),
    },
    {
      id: 'newer-versions',
      label: 'Hide older versions',
      isActive: !showNewerVersions,
      onToggle: (checked: boolean) => setShowNewerVersions(!checked),
    },
  ]

  const lastVersionElementRef = createIntersectionObserver(
    () => setPage(prev => prev + 1),
    hasMore,
  )

  useEffect(() => {
    setPage(1)
    setGreaterPage(1)
  }, [showPreReleases, showNewerVersions, searchTerm])

  useEffect(() => {
    const allVersions = versions ?? []

    const filters = [
      // Filter pre-releases
      (versions: Version[]) =>
        showPreReleases ? versions : (
          versions.filter(version => {
            const preReleaseInfo = prerelease(version.version)
            return (
              preReleaseInfo === undefined ||
              preReleaseInfo.length === 0
            )
          })
        ),

      // Filter newer versions
      (versions: Version[]) => {
        if (showNewerVersions) return versions
        const currentVersion = manifest?.version
        if (typeof currentVersion !== 'string') return versions
        return versions.filter(
          version => !lt(version.version, currentVersion),
        )
      },

      // Search filter
      (versions: Version[]) => {
        if (!searchTerm.trim()) return versions
        const term = searchTerm.toLowerCase()

        return versions.filter(version => {
          const searchableFields = [
            version.version,
            version.unpackedSize ?
              formatDownloadSize(version.unpackedSize)
            : '',
            version.publishedDate ?
              formatDistanceStrict(
                version.publishedDate,
                new Date(),
                { addSuffix: true },
              )
            : '',
            version.integrity,
            version.publishedAuthor?.name,
          ]

          return searchableFields.some(field =>
            field?.toLowerCase().includes(term),
          )
        })
      },
    ]

    // Apply all filters in sequence
    const filteredAllVersions = filters.reduce(
      (versions, filter) => filter(versions),
      allVersions,
    )

    // Add downloads data to each version
    const versionsWithDownloads = filteredAllVersions.map(
      version => ({
        ...version,
        downloadsPerVersion: downloadsPerVersion?.[version.version],
      }),
    )

    setFilteredVersions(versionsWithDownloads)
    setHasMore(versionsWithDownloads.length > page * ITEMS_PER_PAGE)
  }, [
    downloadsPerVersion,
    versions,
    page,
    greaterPage,
    showPreReleases,
    showNewerVersions,
    searchTerm,
  ])

  const isEmpty = !versions?.length
  const hasSearchResults = filteredVersions.length > 0
  const paginatedVersions = filteredVersions.slice(
    0,
    page * ITEMS_PER_PAGE,
  )

  return (
    <TabsContent value="versions">
      {isEmpty ?
        <EmptyState message="There is no versioning information about this package yet" />
      : <section className="flex flex-col gap-2 px-6 py-4">
          <DownloadGraph />

          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex w-full items-center justify-start">
              <Search
                className="absolute ml-3 text-muted-foreground"
                size={16}
              />
              <Input
                placeholder="Filter versions"
                value={searchTerm}
                className="h-9 pl-9"
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 w-fit justify-between gap-2 text-sm [&>[data-chevron]]:aria-expanded:rotate-90">
                  <ListFilter size={16} />
                  <span className="text-sm font-normal">Filter</span>
                  <ChevronRight
                    data-chevron
                    className="transition-transform duration-150"
                    size={16}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {activeFilters.map(filter => (
                  <DropdownMenuCheckboxItem
                    key={filter.id}
                    checked={filter.isActive}
                    onSelect={e => e.preventDefault()}
                    onCheckedChange={filter.onToggle}>
                    {filter.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <AnimatePresence initial={false} mode="popLayout">
            {(!showNewerVersions || !showPreReleases) && (
              <motion.div
                layout
                initial={{ opacity: 0, top: -40 }}
                animate={{ opacity: 1, top: 0 }}
                exit={{ opacity: 0, top: -40 }}
                className="flex gap-2 overflow-hidden"
                transition={{
                  type: 'spring',
                  duration: 0.28,
                  bounce: 0.02,
                }}>
                <AnimatePresence initial={false} mode="sync">
                  {activeFilters.map(
                    (filter, idx) =>
                      filter.isActive && (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{
                            type: 'spring',
                            duration: 0.28,
                            bounce: 0.02,
                          }}
                          className="relative inline-flex cursor-default items-center rounded-full border-[1px] border-muted-foreground/20 bg-white py-1 text-xs font-medium text-foreground dark:bg-muted-foreground/5"
                          key={`filter-${filter.id}-${idx}`}>
                          <span className="px-3">{filter.label}</span>
                        </motion.div>
                      ),
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {!hasSearchResults && searchTerm.trim() ?
            <EmptyState
              message={`No versions found matching "${searchTerm}"`}
            />
          : <>
              {paginatedVersions.length > 0 && (
                <motion.div
                  layout="preserve-aspect"
                  className="relative mt-2 flex flex-col gap-2">
                  <VersionHeader
                    items={filteredVersions}
                    setItems={setFilteredVersions}
                  />
                  <div className="flex flex-col divide-y-[1px] divide-muted overflow-hidden">
                    {paginatedVersions.map((version, idx) => {
                      const downloads =
                        downloadsPerVersion?.[version.version]
                      return (
                        <div
                          key={`${version.version}-all-${idx}`}
                          ref={
                            idx === paginatedVersions.length - 1 ?
                              lastVersionElementRef
                            : undefined
                          }>
                          <VersionItem
                            versionInfo={{
                              ...version,
                              downloadsPerVersion: downloads,
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </>
          }
        </section>
      }
    </TabsContent>
  )
}
