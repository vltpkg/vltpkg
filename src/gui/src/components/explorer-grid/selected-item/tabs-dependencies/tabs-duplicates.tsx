import React from 'react'
import { TabsTrigger, TabsContent } from '@/components/ui/tabs.tsx'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { Blocks } from 'lucide-react'
import { useGraphStore } from '@/state/index.ts'
import { EmptyState } from '@/components/explorer-grid/selected-item/tabs-dependencies/empty-state.tsx'

export const DuplicatesTabButton = () => {
  const duplicatedDeps = useSelectedItemStore(
    state => state.duplicatedDeps,
  )
  const duplicatedDepCount = Object.values(
    duplicatedDeps ?? {},
  ).reduce((acc, { count }) => acc + (count > 1 ? 1 : 0), 0)
  return (
    <TabsTrigger value="duplicates" variant="nestedCard">
      Duplicates
      {duplicatedDepCount > 0 && (
        <DataBadge
          variant="count"
          classNames={{ wrapperClassName: 'ml-1' }}
          content={String(duplicatedDepCount)}
        />
      )}
    </TabsTrigger>
  )
}

export const DuplicatesTabContent = () => {
  const duplicatedDeps = useSelectedItemStore(
    state => state.duplicatedDeps,
  )
  const totalDepCount = useSelectedItemStore(state => state.depCount)
  const query = useGraphStore(state => state.query)
  const updateQuery = useGraphStore(state => state.updateQuery)

  const duplicatedDepCount = Object.values(
    duplicatedDeps ?? {},
  ).reduce((acc, { count }) => acc + (count > 1 ? 1 : 0), 0)

  const queryDuplicatedDeps = (name: string, version?: string) =>
    updateQuery(
      `${query} [name="${name}"]${version ? `:v(${version})` : ''}`,
    )

  return (
    <TabsContent value="duplicates">
      {duplicatedDeps && duplicatedDepCount > 0 ?
        <div className="px-6 pt-4">
          <div className="relative flex w-full cursor-default flex-col gap-2 rounded-sm border-[1px] border-muted bg-secondary/30 px-3 py-3">
            <p className="font-regular text-xs tracking-wide text-muted-foreground">
              Packages with multiple versions
            </p>
            <p className="font-mono text-2xl font-medium tabular-nums text-foreground">
              {duplicatedDepCount}
              <span className="ml-0.5 text-muted-foreground/80">
                /{totalDepCount}
              </span>
            </p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 pb-4">
            {Object.entries(duplicatedDeps).map(([name, info]) => {
              if (info.count <= 1) return null
              return (
                <div
                  key={`${name}-${info.count}`}
                  className="flex h-fit flex-col rounded-lg border-[1px] border-muted">
                  <div
                    role="button"
                    onClick={() => queryDuplicatedDeps(name)}
                    className="duration-250 flex h-fit cursor-default items-start gap-2 border-b-[1px] border-muted px-3 py-3 transition-colors hover:bg-secondary/60">
                    <DataBadge
                      variant="count"
                      content={String(info.count)}
                    />
                    <p className="text-sm font-medium text-foreground">
                      {name}
                    </p>
                  </div>
                  <ul className="flex flex-col">
                    {info.versions.map((version, idx) => (
                      <li
                        role="button"
                        onClick={() =>
                          queryDuplicatedDeps(name, version)
                        }
                        key={`${version}-${idx}`}
                        className="duration-250 cursor-default px-3 py-2 font-mono text-sm font-medium tabular-nums text-muted-foreground transition-colors last-of-type:rounded-b-md hover:bg-secondary/60 hover:text-foreground">
                        v{version}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      : <EmptyState
          icon={Blocks}
          message="No duplicated dependencies found"
        />
      }
    </TabsContent>
  )
}
