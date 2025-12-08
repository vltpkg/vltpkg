import React from 'react'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { Blocks } from 'lucide-react'
import { useGraphStore } from '@/state/index.ts'
import {
  MotionContent,
  contentMotion,
} from '@/components/explorer-grid/selected-item/helpers.tsx'
import { SelectedItemEmptyState } from '@/components/explorer-grid/selected-item/empty-state.tsx'

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
    <MotionContent
      {...contentMotion}
      className="flex h-full flex-col">
      {duplicatedDeps && duplicatedDepCount > 0 ?
        <div className="px-6 pt-4">
          <div className="border-muted bg-secondary/30 relative flex w-full cursor-default flex-col gap-2 rounded-lg border-[1px] px-3 py-3">
            <p className="font-regular text-muted-foreground text-xs tracking-wide">
              Packages with multiple versions
            </p>
            <p className="text-foreground font-mono text-2xl font-medium tabular-nums">
              {duplicatedDepCount}
              <span className="text-muted-foreground/80 ml-0.5">
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
                  className="border-muted flex h-fit flex-col rounded-lg border-[1px]">
                  <div
                    role="button"
                    onClick={() => queryDuplicatedDeps(name)}
                    className="border-muted hover:bg-secondary/60 flex h-fit cursor-default items-start gap-2 border-b-[1px] px-3 py-3 transition-colors duration-250">
                    <DataBadge
                      variant="count"
                      content={String(info.count)}
                    />
                    <p className="text-foreground text-sm font-medium">
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
                        className="text-muted-foreground hover:bg-secondary/60 hover:text-foreground cursor-default px-3 py-2 font-mono text-sm font-medium tabular-nums transition-colors duration-250 last-of-type:rounded-b-md">
                        v{version}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      : <SelectedItemEmptyState
          icon={Blocks}
          title="No duplicates"
          description={`We couldn't find any duplicated\ndependencies for this project`}
        />
      }
    </MotionContent>
  )
}
