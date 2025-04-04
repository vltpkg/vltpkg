import { TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import Markdown from 'react-markdown'
import { FileText, RectangleHorizontal } from 'lucide-react'

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
  const { selectedItemDetails, selectedItem } = useSelectedItem()

  return (
    <TabsContent value="overview">
      {selectedItem.to?.manifest?.description ?
        <div className="px-6 py-4">
          <Markdown className="prose-sm prose-neutral max-w-none text-sm">
            {selectedItem.to.manifest.description}
          </Markdown>
        </div>
      : <div className="flex h-64 w-full items-center justify-center px-6 py-4">
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
              We couldn't find a description for this project
            </p>
          </div>
        </div>
      }
      {selectedItemDetails.author?.name && (
        <div className="border-t-[1px] border-secondary px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Authored by:{' '}
            <span className="font-medium text-foreground">
              {selectedItemDetails.author.name}
            </span>
          </p>
        </div>
      )}
    </TabsContent>
  )
}
