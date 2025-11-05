import { Fragment, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { TabsTrigger } from '@/components/ui/tabs.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  ArrowLeft,
  DecimalsArrowRight,
  Files,
  FileSliders,
  Search,
} from 'lucide-react'
import {
  MotionTabsContent,
  tabMotion,
} from '@/components/explorer-grid/selected-item/helpers.tsx'
import { CodeBlock } from '@/components/ui/code-block.tsx'
import { Markdown } from '@/components/markdown-components.tsx'
import { EmptyState } from '@/components/explorer-grid/selected-item/tabs-code/empty-state.tsx'
import { ErrorState } from '@/components/explorer-grid/selected-item/tabs-code/error-state.tsx'
import { PackageContentItem } from '@/components/explorer-grid/selected-item/tabs-code/package-content-item.tsx'
import { ViewSwitcher } from '@/components/explorer-grid/selected-item/tabs-code/view-switcher.tsx'
import { LoadingState } from '@/components/explorer-grid/selected-item/tabs-code/loading-state.tsx'
import { Input } from '@/components/ui/input.tsx'
import { SortingHeader } from '@/components/explorer-grid/selected-item/tabs-code/sorting-header.tsx'
import { useFsItemSorting } from '@/components/explorer-grid/selected-item/tabs-code/hooks/use-fs-item-sorting.tsx'
import { useCodeExplorer } from '@/components/explorer-grid/selected-item/tabs-code/hooks/use-code-explorer.tsx'
import { useCodeNavigation } from '@/components/explorer-grid/selected-item/tabs-code/hooks/use-code-navigation.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { guessLanguage } from '@/components/explorer-grid/selected-item/tabs-code/utils.ts'
import { cn } from '@/lib/utils.ts'

import type { View } from '@/components/explorer-grid/selected-item/tabs-code/types.ts'
import type { FsItem } from '@/lib/fetch-fs.ts'

export const CodeTabButton = () => {
  return (
    <TabsTrigger variant="ghost" value="code" className="w-fit px-2">
      Code
    </TabsTrigger>
  )
}

export const CodeTabContent = () => {
  const selectedItem = useSelectedItemStore(
    state => state.selectedItem,
  )
  const selectedItemDepId = selectedItem.to?.id
  const selectedItemName = selectedItem.name

  const { '*': codePath } = useParams<{ '*': string }>()

  const [view, setView] = useState<View>('code')

  const itemPriority: Record<FsItem['type'], number> = {
    directory: 0,
    symlink: 1,
    file: 2,
    other: 3,
  }

  const { sortKey, sortDir, onSortClick, applySort, reset } =
    useFsItemSorting(itemPriority)

  const {
    packageContents,
    loading,
    selectedPackageContentItem,
    breadcrumbs,
    nodeResolvedPath,
    onPackageContentItemClick,
    onCrumbClick,
    errors,
  } = useCodeExplorer({
    depId: selectedItemDepId,
    initialRelPath: codePath,
  })

  /**
   * Whenever we navigate, ensure that the view is always reset
   */
  useEffect(() => {
    setView('code')
    setFilter('')
    reset()
  }, [breadcrumbs]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Default to preview for markdown files when a file is selected
   */
  useEffect(() => {
    if (!selectedPackageContentItem) return
    const isMarkdown =
      guessLanguage(
        selectedPackageContentItem.ext,
        selectedPackageContentItem.mime,
      ) === 'markdown'
    setView(isMarkdown ? 'preview' : 'code')
  }, [selectedPackageContentItem])

  const {
    onCrumbNavigate,
    onItemNavigate,
    selectedLines,
    setSelectedLines,
  } = useCodeNavigation({
    breadcrumbs,
    selectedPackageContentItem,
    onCrumbClick,
    onPackageContentItemClick,
    nodeResolvedPath,
  })

  const [filter, setFilter] = useState<string>('')
  const visibleContents = (packageContents ?? []).filter(item =>
    filter.trim() ?
      item.name.toLowerCase().includes(filter.toLowerCase())
    : true,
  )
  const sortedContents = applySort(visibleContents)

  return (
    <MotionTabsContent {...tabMotion} value="code" className="py-4">
      <AnimatePresence initial={false} mode="popLayout">
        {loading ?
          <motion.div
            key="loading"
            initial={{ opacity: 0, filter: 'blur(2px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(2px)' }}>
            <LoadingState />
          </motion.div>
        : !packageContents || packageContents.length === 0 ?
          !errors || errors.length === 0 ?
            <EmptyState />
          : <ErrorState errors={errors} />
        : <motion.div
            key="main"
            initial={{ opacity: 0, filter: 'blur(2px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(2px)' }}>
            <div className="flex flex-col">
              <div className="border-muted overflow-x-scroll border-b px-6 pb-4">
                <h3 className="text-md inline-flex items-baseline gap-1 overflow-x-scroll font-medium whitespace-nowrap">
                  <span
                    onClick={() => {
                      if (nodeResolvedPath)
                        onCrumbNavigate(nodeResolvedPath)
                    }}
                    className="cursor-pointer hover:underline">
                    {selectedItemName}
                  </span>
                  <span className="text-muted-foreground cursor-default">
                    /
                  </span>
                  {breadcrumbs.map((c, idx) => (
                    <Fragment key={c.path}>
                      <span
                        onClick={() => onCrumbNavigate(c.path)}
                        className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-100 hover:underline">
                        {c.name}
                      </span>
                      {idx !== breadcrumbs.length && (
                        <span className="text-muted-foreground cursor-default">
                          /
                        </span>
                      )}
                    </Fragment>
                  ))}
                  {selectedPackageContentItem && (
                    <span className="text-muted-foreground cursor-default">
                      {selectedPackageContentItem.name}
                    </span>
                  )}
                </h3>
              </div>
              {selectedPackageContentItem && (
                <div
                  className={cn(
                    'border-muted flex justify-between gap-2 border-b px-6 pt-2 pb-2',
                    'bg-neutral-100',
                    'dark:bg-neutral-900',
                  )}>
                  <Button
                    onClick={() => {
                      if (breadcrumbs.length > 0) {
                        const last =
                          breadcrumbs[breadcrumbs.length - 1]
                        if (last) onCrumbNavigate(last.path)
                        else if (nodeResolvedPath)
                          onCrumbNavigate(nodeResolvedPath)
                      } else {
                        if (nodeResolvedPath)
                          onCrumbNavigate(nodeResolvedPath)
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-8 rounded-xl border transition-colors duration-150',
                      'border-neutral-300 bg-white hover:border-neutral-200 hover:bg-neutral-100',
                      'dark:border-neutral-700 dark:bg-neutral-800 hover:dark:border-neutral-600 hover:dark:bg-neutral-700',
                    )}>
                    <ArrowLeft />
                    <span>Back</span>
                  </Button>
                  <div className="flex items-center gap-4">
                    <div className="text-muted-foreground flex h-8 items-center gap-2 px-4 font-mono text-xs font-medium tabular-nums [&_p]:cursor-default">
                      <p>{selectedPackageContentItem.mime}</p>
                      <p>{`.${selectedPackageContentItem.ext}`}</p>
                      <p>{selectedPackageContentItem.encoding}</p>
                    </div>
                    <div className="flex items-center">
                      {guessLanguage(
                        selectedPackageContentItem.ext,
                      ) === 'markdown' && (
                        <ViewSwitcher
                          activeView={view}
                          setView={setView}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <AnimatePresence initial={false} mode="popLayout">
              {selectedPackageContentItem?.content ?
                view === 'code' ?
                  <motion.div
                    key={`code:${selectedPackageContentItem.name}`}
                    initial={{ opacity: 0, filter: 'blur(2px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(2px)' }}>
                    <CodeBlock
                      hideFileName
                      hideCopy
                      deepLinkLines
                      language={
                        guessLanguage(
                          selectedPackageContentItem.ext,
                          selectedPackageContentItem.mime,
                        ) ?? 'markdown'
                      }
                      filename={selectedPackageContentItem.name}
                      code={selectedPackageContentItem.content}
                      selectedLines={selectedLines}
                      onSelectedLinesChange={setSelectedLines}
                    />
                  </motion.div>
                : <motion.div
                    key={`markdown:${selectedPackageContentItem.name}`}
                    initial={{ opacity: 0, filter: 'blur(2px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(2px)' }}
                    className="prose-sm prose-neutral prose-li:list-disc w-full max-w-none px-6 py-4">
                    <Markdown>
                      {selectedPackageContentItem.content}
                    </Markdown>
                  </motion.div>

              : null}
              {!selectedPackageContentItem && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, filter: 'blur(2px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(2px)' }}
                  className="flex flex-col">
                  <div className="px-6 pt-4 pb-1">
                    <div className="relative flex w-full items-center">
                      <Search className="text-muted-foreground absolute ml-3 size-4" />
                      <Input
                        placeholder="Filter..."
                        className="h-9 rounded-xl pl-9 text-sm"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 px-6 pt-4 pb-2">
                    <div className="col-span-6">
                      <SortingHeader
                        label="File"
                        icon={Files}
                        onClick={() => onSortClick('name')}
                        dir={
                          sortKey === 'name' ? sortDir : 'unsorted'
                        }
                      />
                    </div>
                    <div className="col-span-3 flex justify-center">
                      <SortingHeader
                        label="Type"
                        icon={FileSliders}
                        onClick={() => onSortClick('type')}
                        dir={
                          sortKey === 'type' ? sortDir : 'unsorted'
                        }
                      />
                    </div>
                    <div className="col-span-3 flex justify-end text-right">
                      <SortingHeader
                        label="Size"
                        icon={DecimalsArrowRight}
                        onClick={() => onSortClick('size')}
                        dir={
                          sortKey === 'size' ? sortDir : 'unsorted'
                        }
                      />
                    </div>
                  </div>
                  {breadcrumbs[breadcrumbs.length - 1] && (
                    <PackageContentItem
                      item={{
                        size: 0,
                        name: '../',
                        type: 'none',
                      }}
                      onClick={() => {
                        if (breadcrumbs.length > 1) {
                          const prev =
                            breadcrumbs[breadcrumbs.length - 2]
                          if (prev) onCrumbNavigate(prev.path)
                          else if (nodeResolvedPath)
                            onCrumbNavigate(nodeResolvedPath)
                        } else {
                          if (nodeResolvedPath)
                            onCrumbNavigate(nodeResolvedPath)
                        }
                      }}
                    />
                  )}
                  {sortedContents.map((item, idx) => (
                    <PackageContentItem
                      key={`${item.name}-${idx}`}
                      item={item}
                      onClick={() => onItemNavigate(item)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        }
      </AnimatePresence>
    </MotionTabsContent>
  )
}
