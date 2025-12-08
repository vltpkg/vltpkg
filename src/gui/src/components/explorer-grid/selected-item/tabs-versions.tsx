import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  memo,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  History,
  ArrowUpDown,
  ChevronRight,
  Search,
  ListFilter,
  CircleHelp,
} from 'lucide-react'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { format, formatDistanceStrict } from 'date-fns'
import { cn } from '@/lib/utils.ts'
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
  TooltipPortal,
} from '@/components/ui/tooltip.tsx'
import { Button } from '@/components/ui/button.tsx'
import { formatDownloadSize } from '@/utils/format-download-size.ts'
import { Input } from '@/components/ui/input.tsx'
import { prerelease, lt } from '@vltpkg/semver'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu.tsx'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart.tsx'
import { Bar, BarChart, XAxis, CartesianGrid } from 'recharts'
import { NumberFlow } from '@/components/number-flow.tsx'
import { useNavigate, useParams } from 'react-router'
import { useGraphStore } from '@/state/index.ts'
import { Separator } from '@/components/ui/separator.tsx'
import { Virtuoso } from 'react-virtuoso'
import { SelectedItemEmptyState } from '@/components/explorer-grid/selected-item/empty-state.tsx'
import {
  contentMotion,
  MotionContent,
} from '@/components/explorer-grid/selected-item/helpers.tsx'

import type { ChartConfig } from '@/components/ui/chart.tsx'
import type { Version } from '@/lib/external-info.ts'
import type { VirtuosoHandle } from 'react-virtuoso'

const VersionHeaderButton = ({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) => {
  return (
    <button
      className="text-muted-foreground hover:bg-secondary hover:text-foreground inline-flex cursor-default items-center justify-center gap-2 rounded-sm px-2 py-1 text-sm text-nowrap transition-colors duration-250 [&>svg]:size-4"
      onClick={onClick}>
      {children}
    </button>
  )
}

const VersionHeader = memo(
  ({
    items,
    setItems,
    totalItems,
  }: {
    items: VersionItem[]
    setItems: (items: VersionItem[]) => void
    totalItems: number
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
      <div className="hidden cursor-default grid-cols-12 gap-3 xl:grid">
        <div className="col-span-2 flex w-full items-center justify-start">
          <VersionHeaderButton onClick={onVersionClick}>
            <ArrowUpDown />
            <span>Versions</span>
            <NumberFlow
              start={totalItems}
              end={items.length}
              motionConfig={{
                duration: 0.2,
              }}
            />
          </VersionHeaderButton>
        </div>
        <div className="col-span-2 ml-1 flex w-full items-center justify-end text-center">
          <VersionHeaderButton onClick={onUnpackedSizeClick}>
            <ArrowUpDown />
            <span>Size</span>
          </VersionHeaderButton>
        </div>
        <div className="col-span-3 w-full text-center">
          <VersionHeaderButton onClick={onPublishedDateClick}>
            <ArrowUpDown />
            <span>Published Date</span>
          </VersionHeaderButton>
        </div>
        <div className="col-span-2 w-full text-center">
          <VersionHeaderButton onClick={onDownloadsClick}>
            <ArrowUpDown />
            <span>Downloads</span>
          </VersionHeaderButton>
        </div>
        <div className="col-span-3 flex w-full items-center justify-center text-center">
          <VersionHeaderButton onClick={onPublisherClick}>
            <ArrowUpDown />
            <span>Publisher</span>
          </VersionHeaderButton>
        </div>
      </div>
    )
  },
)

VersionHeader.displayName = 'VersionHeader'

interface VersionItem extends Version {
  downloadsPerVersion?: number
}

const VersionItem = memo(
  ({ versionInfo }: { versionInfo: VersionItem }) => {
    const {
      version,
      unpackedSize,
      publishedAuthor,
      publishedDate,
      downloadsPerVersion,
    } = versionInfo

    const navigate = useNavigate()
    const params = useParams<{ package?: string; query?: string }>()
    const isExternalPackage = useGraphStore(
      state => state.isExternalPackage,
    )

    const handleVersionClick = () => {
      if (isExternalPackage && params.package) {
        void navigate(`/explore/npm/${params.package}/v/${version}`)
      }
    }

    return (
      <div
        onClick={handleVersionClick}
        className={cn(
          'group/item text-foreground flex grid-cols-12 flex-col gap-3 rounded-sm py-4 first:border-t-[0px] xl:grid xl:gap-3 xl:py-1.5',
          isExternalPackage &&
            'hover:bg-muted/50 cursor-default transition-colors',
          !isExternalPackage && 'cursor-default',
        )}>
        <div className="order-1 col-span-2 flex w-full flex-col justify-center gap-1 xl:justify-center xl:gap-0">
          <p className="text-muted-foreground text-sm font-medium xl:hidden">
            Version
          </p>
          <DataBadge
            variant="mono"
            tooltip={{ content: version }}
            classNames={{
              wrapperClassName:
                'w-fit max-w-none xl:w-fit xl:max-w-[5.5rem]',
              contentClassName: 'truncate pt-0.5',
            }}
            content={version}
          />
        </div>
        <div className="order-2 col-span-2 flex w-full flex-col gap-2 xl:items-end xl:justify-center xl:gap-0 xl:text-center">
          {unpackedSize && (
            <>
              <p className="text-muted-foreground text-sm font-medium xl:hidden">
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
              <p className="text-muted-foreground text-sm font-medium xl:hidden">
                Published Date
              </p>
              <div className="flex gap-2 xl:hidden">
                <Avatar className="size-5">
                  <AvatarImage
                    className="outline-border rounded-sm outline outline-[1px]"
                    src={publishedAuthor?.avatar}
                  />
                  {publishedAuthor?.avatar && (
                    <AvatarFallback className="bg-secondary outline-border h-5 h-full w-5 w-full rounded-sm bg-gradient-to-t from-neutral-100 to-neutral-400 px-[10px] outline outline-[1px] dark:from-neutral-500 dark:to-neutral-800" />
                  )}
                </Avatar>
                <p className="col-span-4 font-mono text-sm">
                  {publishedAuthor?.name}
                </p>
                <p className="text-muted-foreground ml-2 inline-flex font-mono text-sm xl:hidden">
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
                  <TooltipPortal>
                    <TooltipContent>
                      {format(
                        publishedDate,
                        'MMMM do, yyyy | HH:mm:ss',
                      )}
                    </TooltipContent>
                  </TooltipPortal>
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
              <p className="text-muted-foreground text-sm font-medium xl:hidden">
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
                className="outline-border rounded-sm outline outline-[1px]"
                src={publishedAuthor?.avatar}
              />
              {publishedAuthor?.avatar && (
                <AvatarFallback className="bg-secondary outline-border h-full w-full rounded-sm bg-gradient-to-t from-neutral-100 to-neutral-400 px-[10px] outline outline-[1px] dark:from-neutral-500 dark:to-neutral-800" />
              )}
            </Avatar>
            <TooltipProvider>
              <Tooltip delayDuration={150}>
                <TooltipTrigger className="cursor-default">
                  <p className="truncate font-mono text-sm">
                    {publishedAuthor?.name}
                  </p>
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent>
                    {publishedAuthor?.name}
                  </TooltipContent>
                </TooltipPortal>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    )
  },
)

VersionItem.displayName = 'VersionItem'

const DownloadGraph = () => {
  const manifest = useSelectedItemStore(state => state.manifest)
  const downloadsLastYear = useSelectedItemStore(
    state => state.downloadsLastYear,
  )

  if (!downloadsLastYear || !manifest?.version) return null

  const chartConfig = {
    downloads: {
      label: 'Downloads',
      color: 'var(--chart-1)',
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
    <div className="border-muted mb-3 border-b-[1px] pb-1">
      <div className="flex cursor-default justify-between">
        <div className="flex flex-col gap-0.5">
          <TooltipProvider>
            <h3 className="text-foreground inline-flex items-center gap-1 align-baseline text-base font-medium">
              Package Downloads
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground cursor-default">
                    <CircleHelp strokeWidth={2} size={16} />
                  </span>
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent className="font-normal">
                    Downloads across all package versions
                  </TooltipContent>
                </TooltipPortal>
              </Tooltip>
            </h3>
          </TooltipProvider>
          <p className="text-muted-foreground font-mono text-xs">
            {totalDownloads.toLocaleString()}
          </p>
        </div>
        <p className="text-muted-foreground align-baseline text-sm">
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
                className="w-[225px]"
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

  const [showPreReleases, setShowPreReleases] = useState(true)
  const [showNewerVersions, setShowNewerVersions] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredVersions, setFilteredVersions] = useState<
    VersionItem[]
  >([])

  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const [isScrolling, setIsScrolling] = useState<boolean>(false)
  const [isScrolledBottom, setIsScrolledBottom] =
    useState<boolean>(false)

  const handleRangeChange = (range: {
    startIndex: number
    endIndex: number
  }) => {
    const totalItems = filteredVersions.length
    setIsScrolling(range.startIndex > 0)
    setIsScrolledBottom(range.endIndex >= totalItems - 1)
  }

  const filterFunctions = useMemo(
    () => [
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
    ],
    [
      showPreReleases,
      showNewerVersions,
      searchTerm,
      manifest?.version,
    ],
  )

  const processedVersions = useMemo(() => {
    if (!versions) return []

    // Apply all filters in sequence (spread to create mutable copy)
    const filteredAllVersions = filterFunctions.reduce(
      (versions, filter) => filter(versions),
      [...versions],
    )

    // Add downloads data to each version
    return filteredAllVersions.map(version => ({
      ...version,
      downloadsPerVersion: downloadsPerVersion?.[version.version],
    }))
  }, [versions, filterFunctions, downloadsPerVersion])

  // Update filtered versions when processed versions change
  useEffect(() => {
    setFilteredVersions(processedVersions)
  }, [processedVersions])

  const isEmpty = !versions?.length
  const hasSearchResults = filteredVersions.length > 0

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

  return (
    <MotionContent
      {...contentMotion}
      className="flex h-full flex-col">
      {isEmpty ?
        <SelectedItemEmptyState
          icon={History}
          title="No version information"
          description={`There is no versioning information\nabout this package yet`}
        />
      : <section className="flex flex-col px-6 py-4">
          <DownloadGraph />

          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex w-full items-center justify-start">
              <Search
                className="text-muted-foreground absolute ml-3"
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

          <AnimatePresence initial={false} mode="sync">
            {(!showNewerVersions || !showPreReleases) && (
              <motion.div
                initial={{
                  opacity: 0,
                  height: 0,
                }}
                animate={{
                  opacity: 1,
                  height: 'auto',
                }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2 overflow-hidden"
                transition={{
                  type: 'spring',
                  duration: 0.28,
                  bounce: 0.02,
                }}>
                <AnimatePresence initial={false} mode="popLayout">
                  {activeFilters.map(
                    (filter, idx) =>
                      filter.isActive && (
                        <motion.div
                          layout
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
                          className="border-muted-foreground/20 text-foreground dark:bg-muted-foreground/5 relative inline-flex h-fit cursor-default items-center overflow-hidden rounded-full border-[1px] bg-white py-1 text-xs font-medium whitespace-nowrap"
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
            <SelectedItemEmptyState
              icon={History}
              title="No versions found"
              description="We couldn't find any versions matching your search term."
            />
          : <div>
              {filteredVersions.length > 0 && (
                <div className="mt-2 flex flex-col gap-2">
                  <VersionHeader
                    items={filteredVersions}
                    setItems={setFilteredVersions}
                    totalItems={versions.length}
                  />

                  <div className="relative">
                    {isScrolling && (
                      <>
                        <div className="from-card absolute -inset-x-6 top-0 z-[10] h-[20px] w-[calc(100%+3rem)] bg-gradient-to-b" />
                      </>
                    )}
                    {!isScrolledBottom && (
                      <>
                        <div className="from-card absolute -inset-x-6 bottom-0 z-[10] h-[20px] w-[calc(100%+3rem)] bg-gradient-to-t" />
                      </>
                    )}

                    <Virtuoso
                      style={{
                        height: 800,
                      }}
                      ref={virtuosoRef}
                      rangeChanged={handleRangeChange}
                      className="scrollbar-thumb-rounded-full scrollbar scrollbar-thin scrollbar-track-muted-foreground/20 scrollbar-thumb-neutral-500 flex flex-col"
                      data={filteredVersions}
                      itemContent={(i, version) => {
                        const downloads =
                          downloadsPerVersion?.[version.version]
                        return (
                          <React.Fragment
                            key={`${version.version}-${i}`}>
                            <VersionItem
                              versionInfo={{
                                ...version,
                                downloadsPerVersion: downloads,
                              }}
                            />
                            <Separator />
                          </React.Fragment>
                        )
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          }
        </section>
      }
    </MotionContent>
  )
}
