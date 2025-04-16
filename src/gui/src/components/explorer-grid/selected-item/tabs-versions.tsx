import { useEffect, useState, useCallback, useRef } from 'react'
import { TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx'
import {
  History,
  ArrowUpDown,
  ChevronDown,
  Search,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import { InlineCode } from '@/components/ui/inline-code.jsx'
import { format, formatDistanceStrict } from 'date-fns'
import type { Version } from '@/lib/external-info.js'
import { cn } from '@/lib/utils.js'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible.jsx'
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
import { CopyToClipboard } from '@/components/ui/copy-to-clipboard.jsx'
import { formatDownloadSize } from '@/utils/format-download-size.js'
import { Input } from '@/components/ui/input.jsx'
import { prerelease } from '@vltpkg/semver'

export const VersionsTabButton = () => {
  const { selectedItemDetails } = useSelectedItem()
  const { versions, greaterVersions } = selectedItemDetails

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
  items: Version[]
  setItems: (items: Version[]) => void
}) => {
  const [order, setOrder] = useState<{
    version: 'asc' | 'desc'
    unpackedSize: 'asc' | 'desc'
    publishedDate: 'asc' | 'desc'
    publisher: 'asc' | 'desc'
  }>({
    version: 'asc',
    unpackedSize: 'asc',
    publishedDate: 'asc',
    publisher: 'asc',
  })

  const sortItems = (key: keyof Version, order: 'asc' | 'desc') => {
    setItems(
      [...items].sort((a, b) => {
        if (key === 'unpackedSize') {
          const aSize = a[key] ?? 0
          const bSize = b[key] ?? 0
          return order === 'asc' ? aSize - bSize : bSize - aSize
        }
        if (key === 'publishedDate') {
          const aDate = a[key] ? new Date(a[key]).getTime() : 0
          const bDate = b[key] ? new Date(b[key]).getTime() : 0
          return order === 'asc' ? aDate - bDate : bDate - aDate
        }
        if (key === 'publishedAuthor') {
          const aName = a.publishedAuthor?.name
          const bName = b.publishedAuthor?.name

          // We only want to compare the names if both are defined
          if (!aName || !bName) return 0

          const comparison = aName
            .toLowerCase()
            .localeCompare(bName.toLowerCase())
          return order === 'asc' ? comparison : -comparison
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

  const onPublisherClick = () => {
    const newOrder = order.publisher === 'asc' ? 'desc' : 'asc'
    setOrder(prev => ({ ...prev, publisher: newOrder }))
    sortItems('publishedAuthor', newOrder)
  }

  return (
    <div className="mt-4 hidden cursor-default grid-cols-12 pb-2 2xl:grid">
      <div className="col-span-2 w-full pl-2">
        <button
          onClick={onVersionClick}
          className="relative z-[1] inline-flex w-fit cursor-default items-center justify-center gap-2 text-nowrap text-sm text-muted-foreground transition-all duration-300 after:absolute after:left-[-0.75rem] after:z-[-1] after:h-[calc(100%+0.5rem)] after:w-[calc(100%+1.5rem)] after:rounded-sm after:bg-transparent after:content-[''] hover:text-foreground hover:after:bg-muted">
          <span>Version</span>
          <ArrowUpDown size={16} />
        </button>
      </div>
      <div className="col-span-2 w-full text-center">
        <button className="relative z-[1] inline-flex w-fit cursor-default items-center justify-center gap-2 text-nowrap text-sm text-muted-foreground transition-all duration-300 after:absolute after:left-[-0.75rem] after:z-[-1] after:h-[calc(100%+0.5rem)] after:w-[calc(100%+1.5rem)] after:rounded-sm after:bg-transparent after:content-[''] hover:text-foreground hover:after:bg-muted">
          <span>Integrity</span>
        </button>
      </div>
      <div className="col-span-2 w-full text-center">
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
      <div className="col-span-3 mr-1 flex w-full justify-center">
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

interface VersionItemProps {
  versionInfo: Version
}

const VersionItem = ({ versionInfo }: VersionItemProps) => {
  const {
    integrity,
    version,
    unpackedSize,
    publishedAuthor,
    publishedDate,
  } = versionInfo
  const integrityShort = integrity?.split('-')[1]?.slice(0, 6)

  return (
    <div className="group/item flex cursor-default grid-cols-12 flex-col gap-4 rounded-sm py-4 text-foreground transition-all first:border-t-[0px] hover:bg-muted 2xl:grid 2xl:gap-0 2xl:px-2 2xl:py-1.5">
      <div className="col-span-2 flex w-full flex-col justify-start gap-1 2xl:ml-1 2xl:justify-center 2xl:gap-0">
        <p className="text-sm font-medium text-muted-foreground 2xl:hidden">
          Version
        </p>
        <InlineCode
          tooltipDuration={150}
          displayTooltip
          tooltip={version}
          className="mx-0 w-fit max-w-none truncate break-all text-sm 2xl:w-fit 2xl:max-w-24"
          variant="mono">
          {version}
        </InlineCode>
      </div>
      <div className="col-span-2 flex w-full flex-col justify-start gap-2 2xl:items-center 2xl:justify-center 2xl:gap-0 2xl:text-center">
        <p className="text-sm font-medium text-muted-foreground 2xl:hidden">
          Integrity
        </p>
        {integrity && (
          <CopyToClipboard
            toolTipText={`Copy full SHA for ${integrityShort}`}
            copyValue={integrity}
            className="w-fit group-hover/item:bg-neutral-300 dark:group-hover/item:bg-neutral-700">
            {integrityShort}
          </CopyToClipboard>
        )}
      </div>
      <div className="col-span-2 flex w-full flex-col gap-2 2xl:items-center 2xl:justify-center 2xl:gap-0 2xl:text-center">
        {unpackedSize && (
          <>
            <p className="text-sm font-medium text-muted-foreground 2xl:hidden">
              Size
            </p>
            <p className="font-mono text-sm">
              {formatDownloadSize(unpackedSize)}
            </p>
          </>
        )}
      </div>
      <div className="col-span-3 flex w-full flex-col gap-2 2xl:items-center 2xl:justify-center 2xl:gap-0 2xl:text-center">
        {publishedDate && (
          <>
            <p className="text-sm font-medium text-muted-foreground 2xl:hidden">
              Published Date
            </p>
            <div className="flex gap-2 2xl:hidden">
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
              <p className="ml-2 inline-flex font-mono text-sm text-muted-foreground 2xl:hidden">
                {formatDistanceStrict(publishedDate, new Date(), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="hidden cursor-default font-mono text-sm 2xl:inline-flex">
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
      <div className="col-span-3 flex hidden w-full items-center justify-center 2xl:mr-1 2xl:flex 2xl:justify-end">
        <div className="flex grid-cols-5 gap-2 2xl:grid">
          <Avatar className="col-span-1 size-5">
            <AvatarImage
              className="rounded-sm outline outline-[1px] outline-border"
              src={publishedAuthor?.avatar}
            />
            {publishedAuthor?.avatar && (
              <AvatarFallback className="h-5 h-full w-5 w-full rounded-sm bg-secondary bg-gradient-to-t from-neutral-100 to-neutral-400 px-[10px] outline outline-[1px] outline-border dark:from-neutral-500 dark:to-neutral-800" />
            )}
          </Avatar>
          <p className="col-span-4 truncate font-mono text-sm">
            {publishedAuthor?.name}
          </p>
        </div>
      </div>
    </div>
  )
}

const ITEMS_PER_PAGE = 20

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

export const VersionsTabContent = () => {
  const { selectedItemDetails } = useSelectedItem()
  const [filteredVersions, setFilteredVersions] = useState<Version[]>(
    [],
  )
  const [filteredGreaterVersions, setFilteredGreaterVersions] =
    useState<Version[]>([])
  const [greaterVersionsOpen, setGreaterVersionsOpen] = useState(true)
  const [page, setPage] = useState(1)
  const [greaterPage, setGreaterPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [hasMoreGreater, setHasMoreGreater] = useState(true)
  const [showPreReleases, setShowPreReleases] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const lastVersionElementRef = createIntersectionObserver(
    () => setPage(prev => prev + 1),
    hasMore,
  )

  const lastGreaterVersionElementRef = createIntersectionObserver(
    () => setGreaterPage(prev => prev + 1),
    hasMoreGreater,
  )

  useEffect(() => {
    setPage(1)
    setGreaterPage(1)
  }, [showPreReleases, searchTerm])

  useEffect(() => {
    const allVersions = selectedItemDetails.versions ?? []
    const allGreaterVersions =
      selectedItemDetails.greaterVersions ?? []

    const filterPreReleases = (versions: Version[]) => {
      if (showPreReleases) return versions
      return versions.filter(version => {
        const preReleaseInfo = prerelease(version.version)
        return (
          preReleaseInfo === undefined || preReleaseInfo.length === 0
        )
      })
    }

    const filterBySearch = (versions: Version[]) => {
      if (!searchTerm.trim()) return versions
      const term = searchTerm.toLowerCase()

      return versions.filter(version => {
        // Check version number
        if (version.version.toLowerCase().includes(term)) return true

        // Check size
        if (version.unpackedSize) {
          const sizeStr = formatDownloadSize(
            version.unpackedSize,
          ).toLowerCase()
          if (sizeStr.includes(term)) return true
        }

        // Check published date
        if (version.publishedDate) {
          const dateStr = formatDistanceStrict(
            version.publishedDate,
            new Date(),
            { addSuffix: true },
          ).toLowerCase()
          if (dateStr.includes(term)) return true
        }

        // Check integrity
        if (version.integrity?.toLowerCase().includes(term))
          return true

        // Check publisher name
        if (
          version.publishedAuthor?.name?.toLowerCase().includes(term)
        )
          return true

        return false
      })
    }

    const filteredAllVersions = filterBySearch(
      filterPreReleases(allVersions),
    )
    const filteredAllGreaterVersions = filterBySearch(
      filterPreReleases(allGreaterVersions),
    )

    setFilteredVersions(
      filteredAllVersions.slice(0, page * ITEMS_PER_PAGE),
    )
    setFilteredGreaterVersions(
      filteredAllGreaterVersions.slice(
        0,
        greaterPage * ITEMS_PER_PAGE,
      ),
    )
    setHasMore(filteredAllVersions.length > page * ITEMS_PER_PAGE)
    setHasMoreGreater(
      filteredAllGreaterVersions.length >
        greaterPage * ITEMS_PER_PAGE,
    )
  }, [
    selectedItemDetails,
    page,
    greaterPage,
    showPreReleases,
    searchTerm,
  ])

  const isEmpty =
    !selectedItemDetails.versions?.length &&
    !selectedItemDetails.greaterVersions?.length
  const hasSearchResults =
    filteredVersions.length > 0 || filteredGreaterVersions.length > 0

  return (
    <TabsContent value="versions">
      {isEmpty ?
        <EmptyState message="There is no versioning information about this package yet" />
      : <section className="flex flex-col gap-4 px-6 py-4">
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
            <Button
              variant="outline"
              className="h-9 w-60 justify-between gap-2 text-sm"
              onClick={() => setShowPreReleases(!showPreReleases)}>
              {showPreReleases ?
                <EyeOff size={16} />
              : <Eye size={16} />}
              <span className="text-sm font-normal">
                {showPreReleases ?
                  'Hide pre-releases'
                : 'Show pre-releases'}
              </span>
            </Button>
          </div>

          {!hasSearchResults && searchTerm.trim() ?
            <EmptyState
              message={`No versions found matching "${searchTerm}"`}
            />
          : <>
              {filteredGreaterVersions.length > 0 && (
                <Collapsible
                  defaultOpen
                  open={greaterVersionsOpen}
                  className="mb-3 flex flex-col gap-2">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="inline-flex h-fit w-full cursor-default items-center justify-between gap-1 px-3 py-1.5 text-sm font-medium text-muted-foreground [&>svg]:data-[state=closed]:-rotate-90"
                      onClick={() =>
                        setGreaterVersionsOpen(!greaterVersionsOpen)
                      }>
                      <span>
                        {greaterVersionsOpen ? 'Hide' : 'Show'}{' '}
                        Greater Versions
                      </span>
                      <ChevronDown
                        className="duration-250 transition-transform"
                        size={16}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="relative flex flex-col gap-2 overflow-hidden">
                    <VersionHeader
                      items={filteredGreaterVersions}
                      setItems={setFilteredGreaterVersions}
                    />
                    <div className="flex flex-col divide-y-[1px] divide-muted">
                      {filteredGreaterVersions.map((version, idx) => (
                        <div
                          key={`${version.version}-greater-${idx}`}
                          ref={
                            (
                              idx ===
                              filteredGreaterVersions.length - 1
                            ) ?
                              lastGreaterVersionElementRef
                            : undefined
                          }>
                          <VersionItem versionInfo={version} />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {filteredVersions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="cursor-default text-sm font-medium text-muted-foreground 2xl:ml-2">
                    All Versions
                  </p>
                  <div className="relative flex flex-col gap-2">
                    <VersionHeader
                      items={filteredVersions}
                      setItems={setFilteredVersions}
                    />
                    <div className="flex flex-col divide-y-[1px] divide-muted">
                      {filteredVersions.map((version, idx) => (
                        <div
                          key={`${version.version}-all-${idx}`}
                          ref={
                            idx === filteredVersions.length - 1 ?
                              lastVersionElementRef
                            : undefined
                          }>
                          <VersionItem versionInfo={version} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          }
        </section>
      }
    </TabsContent>
  )
}
