import { TabsTrigger } from '@/components/ui/tabs.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { Markdown } from '@/components/markdown-components.tsx'
import { FileText, RectangleHorizontal } from 'lucide-react'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { ContributorList } from '@/components/explorer-grid/selected-item/tabs-contributors.tsx'
import {
  MotionTabsContent,
  tabMotion,
} from '@/components/explorer-grid/selected-item/helpers.tsx'
import { AsideOverview } from '@/components/explorer-grid/selected-item/aside/index.tsx'

export const OverviewTabButton = () => {
  return (
    <TabsTrigger
      variant="ghost"
      value="overview"
      className="w-fit px-2">
      Overview
    </TabsTrigger>
  )
}

export const OverviewTabContent = () => {
  const manifest = useSelectedItemStore(state => state.manifest)
  const asideOverviewVisible = useSelectedItemStore(
    state => state.asideOveriewVisible,
  )

  const keywords = manifest?.keywords

  return (
    <MotionTabsContent
      {...tabMotion}
      value="overview"
      className="divide-x-none group flex grid-cols-12 flex-col divide-muted xl:grid xl:divide-x-[1px] [&>aside]:border-b-[1px] xl:[&>aside]:border-b-[0px]">
      <div className="order-2 flex flex-col gap-4 xl:order-1 xl:col-span-12 xl:group-[&:has(aside)]:col-span-8">
        {manifest?.description ?
          <div className="flex flex-col gap-2 px-6 py-4">
            <h4 className="text-sm font-medium capitalize text-muted-foreground">
              description
            </h4>
            <div className="prose-sm prose-neutral max-w-none text-sm">
              <Markdown>{manifest.description}</Markdown>
            </div>
          </div>
        : <EmptyState />}

        <ContributorList />

        {keywords && (
          <div className="mt-auto flex flex-col justify-end gap-2 px-6 py-4">
            <h4 className="text-sm font-medium capitalize text-muted-foreground">
              keywords
            </h4>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, idx) => (
                <DataBadge
                  classNames={{
                    wrapperClassName: 'inline-flex h-fit',
                  }}
                  key={`${keyword}-${idx}`}
                  content={keyword}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {asideOverviewVisible && <AsideOverview />}
    </MotionTabsContent>
  )
}

const EmptyState = () => {
  return (
    <div className="flex h-64 w-full items-center justify-center px-6 py-4">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="relative flex size-32 items-center justify-center rounded-full bg-secondary/60">
          <RectangleHorizontal
            className="absolute z-[2] mt-3 size-9 -translate-x-4 -rotate-[calc(90deg+30deg)] fill-secondary text-muted-foreground/50"
            strokeWidth={1.25}
          />
          <FileText
            className="absolute z-[3] size-14 fill-secondary text-neutral-500"
            strokeWidth={1}
          />
          <RectangleHorizontal
            className="absolute z-[2] mt-3 size-9 translate-x-4 rotate-[calc(90deg+30deg)] fill-secondary text-muted-foreground/50"
            strokeWidth={1.25}
          />
        </div>
        <p className="w-2/3 text-pretty text-sm text-muted-foreground">
          We couldn't find a description for this project.
        </p>
      </div>
    </div>
  )
}
