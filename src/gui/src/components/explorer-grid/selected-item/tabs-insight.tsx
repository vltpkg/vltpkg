import { Link } from 'react-router'
import { useState } from 'react'
import { TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx'
import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import {
  InsightBadge,
  getAlertColor,
} from '@/components/explorer-grid/selected-item/insight-badge.jsx'
import type { SocketSecurityDetails } from '@/lib/constants/index.js'
import type { PackageAlert } from '@vltpkg/security-archive'
import { ArrowUpDown, BadgeInfo } from 'lucide-react'

export const InsightTabButton = () => {
  return (
    <TabsTrigger
      variant="ghost"
      value="insights"
      className="w-fit px-2">
      Insights
    </TabsTrigger>
  )
}

const InsightHeader = ({
  items,
  setItems,
}: {
  items: SocketSecurityDetails[]
  setItems: (items: SocketSecurityDetails[]) => void
}) => {
  const [order, setOrder] = useState<{
    insight: 'asc' | 'desc'
    category: 'asc' | 'desc'
  }>({ insight: 'asc', category: 'asc' })

  const sortItems = (
    key: keyof SocketSecurityDetails,
    order: 'asc' | 'desc',
  ) => {
    setItems(
      [...items].sort((a, b) => {
        if (a[key] < b[key]) return order === 'asc' ? -1 : 1
        if (a[key] > b[key]) return order === 'asc' ? 1 : -1
        return 0
      }),
    )
  }

  const onInsightClick = () => {
    const newOrder = order.insight === 'asc' ? 'desc' : 'asc'
    setOrder(prev => ({ ...prev, insight: newOrder }))
    sortItems('selector', newOrder)
  }

  const onCategoryClick = () => {
    const newOrder = order.category === 'asc' ? 'desc' : 'asc'
    setOrder(prev => ({ ...prev, category: newOrder }))
    sortItems('category', newOrder)
  }

  return (
    <div className="mb-4 grid cursor-default grid-cols-10 gap-2 border-b-[1px] border-muted px-2 pb-4">
      <div className="col-span-3 flex w-full items-start">
        <button
          onClick={onInsightClick}
          className="group relative z-[1] inline-flex w-fit cursor-default items-center justify-center gap-2 text-sm text-muted-foreground transition-all duration-300 after:absolute after:left-[-0.75rem] after:z-[-1] after:h-[calc(100%+0.5rem)] after:w-[calc(100%+1.5rem)] after:rounded-sm after:bg-transparent after:content-[''] hover:text-foreground hover:after:bg-muted">
          <span>Insight</span>
          <ArrowUpDown size={16} />
        </button>
      </div>
      <div className="col-span-2 flex w-full items-start">
        <button
          onClick={onCategoryClick}
          className="group relative z-[1] inline-flex w-fit cursor-default items-center justify-center gap-2 text-sm text-muted-foreground transition-all duration-300 after:absolute after:left-[-0.75rem] after:z-[-1] after:h-[calc(100%+0.5rem)] after:w-[calc(100%+1.5rem)] after:rounded-sm after:bg-transparent after:content-[''] hover:text-foreground hover:after:bg-muted">
          <span>Category</span>
          <ArrowUpDown size={16} />
        </button>
      </div>
      <div className="col-span-5 flex w-full items-start">
        <p className="text-sm text-muted-foreground">Description</p>
      </div>
    </div>
  )
}

const InsightItem = ({
  severity,
  selector,
  category,
  description,
}: {
  severity: PackageAlert['severity']
  selector: string
  category: SocketSecurityDetails['category']
  description: string
}) => {
  return (
    <div className="duration-250 grid cursor-default grid-cols-10 gap-2 rounded-sm px-2 py-4 transition-all hover:bg-muted">
      <div className="col-span-3 flex w-full items-start">
        <InsightBadge
          color={getAlertColor(severity)}
          tooltipContent={severity}>
          {selector}
        </InsightBadge>
      </div>
      <div className="col-span-2 flex w-full">
        <p className="text-sm">{category}</p>
      </div>
      <div className="col-span-5 flex">
        <p className="text-pretty text-sm">{description}</p>
      </div>
    </div>
  )
}

export const InsightTabContent = () => {
  const { insights } = useSelectedItem()
  const [filteredInsights, setFilteredInsights] = useState<
    SocketSecurityDetails[] | undefined
  >(insights)

  return (
    <TabsContent value="insights">
      {filteredInsights && filteredInsights.length > 0 ?
        <section className="mt-2 flex flex-col px-6 py-4">
          <InsightHeader
            items={filteredInsights}
            setItems={setFilteredInsights}
          />

          <div className="flex flex-col divide-y-[1px] divide-muted">
            {filteredInsights.map((insight, idx) => (
              <InsightItem
                key={idx}
                selector={insight.selector}
                severity={insight.severity}
                description={insight.description}
                category={insight.category}
              />
            ))}
          </div>
        </section>
      : <div className="flex h-64 w-full items-center justify-center px-6 py-4">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="relative flex size-32 items-center justify-center rounded-full bg-secondary/60">
              <BadgeInfo
                className="absolute z-[3] size-14 text-neutral-500"
                strokeWidth={1}
              />
            </div>
            <p className="w-2/3 text-pretty text-sm text-muted-foreground">
              There are no insights for this package
            </p>
          </div>
        </div>
      }

      <div className="w-full px-6 py-4">
        <Link
          to="/help/selectors"
          className="group relative z-[1] inline-flex w-fit cursor-default items-center justify-center text-sm text-muted-foreground transition-all duration-300 after:absolute after:left-[-0.75rem] after:z-[-1] after:h-[calc(100%+0.5rem)] after:w-[calc(100%+1.5rem)] after:rounded-sm after:bg-transparent after:content-[''] hover:text-foreground hover:after:bg-muted">
          See all Selectors & Insights
        </Link>
      </div>
    </TabsContent>
  )
}
