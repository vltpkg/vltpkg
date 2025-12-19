import { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { useGraphStore } from '@/state/index.ts'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import {
  useDependencySidebarStore,
  useOperation,
} from '@/components/explorer-grid/dependency-sidebar/context.tsx'
import { SideItem } from '@/components/explorer-grid/side-item.tsx'
import {
  FilterButton,
  FilterListEmptyState,
} from '@/components/explorer-grid/dependency-sidebar/filter.tsx'
import { DependencyEmptyState } from '@/components/explorer-grid/dependency-sidebar/empty-state.tsx'
import { NumberFlow } from '@/components/number-flow.tsx'
import { AddDependenciesPopoverTrigger } from '@/components/explorer-grid/dependency-sidebar/add-dependency.tsx'
import { Cross } from '@/components/ui/cross.tsx'
import { recordToArray } from '@/utils/record-to-array.ts'
import { cn } from '@/lib/utils.ts'

import type { NormalizedManifest } from '@vltpkg/types'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { Spec } from '@vltpkg/spec/browser'

const getAllExternalDependencies = ({
  manifest,
}: {
  manifest: NormalizedManifest
}): Partial<GridItemData>[] => {
  const prodDeps = recordToArray(
    manifest.dependencies,
    'name',
    'version',
  )?.map(item => ({
    name: item.name,
    id: item.name,
    title: item.name,
    size: 1,
    stacked: false,
    spec: {
      bareSpec: item.version,
    } as unknown as Spec,
  }))

  const devDeps = recordToArray(
    manifest.devDependencies,
    'name',
    'version',
  )?.map(item => ({
    name: item.name,
    id: item.name,
    title: item.name,
    size: 1,
    stacked: false,
    labels: ['dev'],
    spec: {
      bareSpec: item.version,
    } as unknown as Spec,
  }))

  const peerDeps = recordToArray(
    manifest.peerDependencies,
    'name',
    'version',
  )?.map(item => ({
    name: item.name,
    id: item.name,
    title: item.name,
    size: 1,
    stacked: false,
    labels: ['peer'],
    spec: {
      bareSpec: item.version,
    } as unknown as Spec,
  }))

  const optionalDeps = recordToArray(
    manifest.optionalDependencies,
    'name',
    'version',
  )?.map(item => ({
    name: item.name,
    id: item.name,
    title: item.name,
    size: 1,
    stacked: false,
    labels: ['optional'],
    spec: {
      bareSpec: item.version,
    } as unknown as Spec,
  }))

  return [
    ...(prodDeps ?? []),
    ...(devDeps ?? []),
    ...(peerDeps ?? []),
    ...(optionalDeps ?? []),
  ]
}

export const DependencySideBar = ({
  className,
}: {
  className?: string
}) => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const manifest = useSelectedItemStore(state => state.manifest)
  const importerId = useDependencySidebarStore(
    state => state.importerId,
  )
  const dependencies = useDependencySidebarStore(
    state => state.dependencies,
  )
  const filteredDependencies = useDependencySidebarStore(
    state => state.filteredDependencies,
  )
  const addedDependencies = useDependencySidebarStore(
    state => state.addedDependencies,
  )
  const uninstalledDependencies = useDependencySidebarStore(
    state => state.uninstalledDependencies,
  )
  const onDependencyClick = useDependencySidebarStore(
    state => state.onDependencyClick,
  )
  const query = useGraphStore(state => state.query)
  const updateQuery = useGraphStore(state => state.updateQuery)

  const { operation } = useOperation()

  // Memoize sorted dependencies to prevent unnecessary re-sorting
  const sortedDependencies = useMemo(() => {
    const added = filteredDependencies
      .filter(item => addedDependencies.includes(item.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))

    const notAdded = filteredDependencies
      .filter(item => !addedDependencies.includes(item.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))

    return [...added, ...notAdded]
  }, [filteredDependencies, addedDependencies])

  // Memoize sorted uninstalled dependencies
  const sortedUninstalledDependencies = useMemo(
    () =>
      uninstalledDependencies.sort((a, b) =>
        a.name.localeCompare(b.name, 'en'),
      ),
    [uninstalledDependencies],
  )

  const isExternal = pathname.includes('explore/npm')

  const externalDependencies =
    isExternal && manifest ?
      getAllExternalDependencies({ manifest })
    : undefined

  const onSelectExternal = (packageName: string) => {
    void navigate(`/explore/npm/${packageName}/overview`)
  }

  const isEmpty =
    isExternal ?
      !externalDependencies || externalDependencies.length === 0
    : dependencies.length === 0 && filteredDependencies.length === 0

  const countInitialStart =
    dependencies.length !== 0 ? dependencies.length
    : externalDependencies?.length !== 0 && externalDependencies ?
      externalDependencies.length
    : 0

  const countInitialEnd =
    filteredDependencies.length !== 0 ? filteredDependencies.length
    : externalDependencies?.length !== 0 && externalDependencies ?
      externalDependencies.length
    : 0

  return (
    <aside className={cn('flex w-full flex-col', className)}>
      <div className="border-background-secondary flex h-12 w-full items-center justify-between border-b px-6 py-3">
        <h3 className="text-sm font-medium">
          <span className="mr-2">Dependencies</span>
          <NumberFlow
            start={countInitialStart}
            end={countInitialEnd}
            format={{
              pad: 0,
            }}
            motionConfig={{
              duration: 0.4,
            }}
            classNames={{
              span: 'text-muted-foreground',
            }}
          />
          <span className="text-muted-foreground font-mono text-sm tabular-nums">
            /
          </span>
          <NumberFlow
            start={countInitialEnd}
            end={countInitialStart}
            format={{
              pad: 0,
            }}
            motionConfig={{
              duration: 0.4,
            }}
            classNames={{
              span: 'text-muted-foreground',
            }}
          />
        </h3>
        {importerId && (
          <div className="flex items-center gap-2">
            <AddDependenciesPopoverTrigger />
            <FilterButton />
          </div>
        )}
      </div>
      <FilterListEmptyState />
      {sortedDependencies.length !== 0 && (
        <motion.div
          layout="position"
          className="flex flex-col gap-4 px-6 py-3">
          <AnimatePresence initial={false} mode="popLayout">
            {sortedDependencies.map(item => (
              <SideItem
                item={item}
                key={item.id}
                dependencies={true}
                onSelect={onDependencyClick({
                  item,
                  query,
                  updateQuery,
                })}
                onUninstall={() =>
                  operation({
                    item: {
                      name: item.name,
                      version: item.version,
                    },
                    operationType: 'uninstall',
                  })
                }
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      {isExternal &&
        externalDependencies &&
        externalDependencies.length !== 0 && (
          <div className="flex flex-col gap-4 px-6 py-3">
            {externalDependencies.map((dep, idx) => (
              <SideItem
                onSelect={() =>
                  dep.name && onSelectExternal(dep.name)
                }
                item={dep as GridItemData}
                key={`${dep.id}-${idx}`}
              />
            ))}
          </div>
        )}
      {isEmpty && <DependencyEmptyState />}
      {sortedUninstalledDependencies.length > 0 && (
        <motion.div layout="position" className="flex flex-col">
          <div
            className={cn(
              'border-background-secondary relative flex h-12 w-full items-center border-b px-6',
              sortedDependencies.length !== 0 && 'border-t',
              isEmpty && 'border-t',
            )}>
            {sortedDependencies.length !== 0 && <Cross top left />}
            {isEmpty && <Cross top left />}
            <Cross bottom left />
            <h3 className="text-muted-foreground text-sm font-medium">
              Uninstalled
            </h3>
          </div>
          <div className="flex flex-col gap-4 px-6 py-3">
            {sortedUninstalledDependencies.map(item => (
              <SideItem
                item={item}
                key={item.id}
                dependencies={false}
              />
            ))}
          </div>
        </motion.div>
      )}
    </aside>
  )
}
