import { Link } from 'react-router'
import { useState } from 'react'
import { TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.jsx'
import {
  InsightBadge,
  getAlertColor,
} from '@/components/explorer-grid/selected-item/insight-badge.jsx'
import type { SocketSecurityDetails } from '@/lib/constants/index.js'
import type { PackageAlert } from '@vltpkg/security-archive'
import { ArrowUpDown, BadgeCheck, BadgeInfo } from 'lucide-react'
import {
  getScoreColor,
  scoreColors,
} from '@/components/explorer-grid/selected-item/insight-score-helper.js'
import { Link as AnchorLink } from '@/components/ui/link.jsx'
import { DataBadge } from '@/components/ui/data-badge.jsx'
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from 'recharts'
import { ChartContainer } from '@/components/ui/chart.jsx'
import type { ChartConfig } from '@/components/ui/chart.jsx'
import { cn } from '@/lib/utils.js'

export const InsightTabButton = () => {
  const insights = useSelectedItemStore(state => state.insights)

  return (
    <TabsTrigger
      variant="ghost"
      value="insights"
      className="w-fit px-2">
      Insights
      {insights && insights.length !== 0 && (
        <DataBadge
          variant="count"
          classNames={{ wrapperClassName: 'ml-1' }}
          content={String(insights.length)}
        />
      )}
    </TabsTrigger>
  )
}

const InsightScoreChart = ({
  score,
  label = true,
}: {
  score: { name: string; value: number }
  label?: boolean
}) => {
  const chartColor = scoreColors[getScoreColor(score.value)]

  const chartData = [
    {
      name: 'Score',
      score: score.value,
      fill: chartColor,
    },
  ]

  const chartConfig = {
    score: {
      label: 'Score',
    },
  } satisfies ChartConfig

  return (
    <div className="flex flex-col items-center justify-center">
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square h-[100px]">
        <RadialBarChart
          data={chartData}
          startAngle={0}
          endAngle={-360 * (score.value / 100)}
          innerRadius={30}
          outerRadius={40}>
          <PolarGrid
            gridType="circle"
            radialLines={false}
            stroke="none"
            polarRadius={[32, 28]}
            className="first:fill-muted last:fill-background"
          />
          <RadialBar
            dataKey="score"
            background={{ fill: 'hsl(var(--muted))' }}
            cornerRadius={10}
          />
          <PolarRadiusAxis
            tick={false}
            tickLine={false}
            axisLine={false}>
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle">
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="cursor-default fill-foreground text-sm font-medium">
                        {score.value}%
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          </PolarRadiusAxis>
        </RadialBarChart>
      </ChartContainer>
      {label && (
        <p className="cursor-default whitespace-nowrap text-sm font-medium capitalize">
          {score.name}
        </p>
      )}
    </div>
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

const InsightScore = () => {
  const selectedItem = useSelectedItemStore(
    state => state.selectedItem,
  )
  const packageScore = useSelectedItemStore(
    state => state.packageScore,
  )

  if (!packageScore) return null

  const scoreOrder = [
    'overall',
    'quality',
    'supplyChain',
    'maintenance',
    'vulnerability',
    'license',
  ]

  const SCORES_TO_EXCLUDE = ['overall', 'average']

  const scores = Object.entries(packageScore)
    .filter(([key]) => !SCORES_TO_EXCLUDE.includes(key))
    .map(([key, value]) => ({
      id: key,
      name: key === 'supplyChain' ? 'supply chain' : key,
      value: Math.round(value * 100),
    }))
    .sort(
      (a, b) => scoreOrder.indexOf(a.id) - scoreOrder.indexOf(b.id),
    )

  return (
    <section className="mt-3 border-b-[1px] border-muted pb-6">
      <div className="grid grid-cols-5 gap-2 px-6">
        {scores.map(score => (
          <InsightScoreChart key={score.id} score={score} />
        ))}
      </div>
      <div className="px-6 pt-6">
        <p className="w-2/3 cursor-default text-sm text-muted-foreground">
          Package Insight Scores are powered by{' '}
          <AnchorLink
            href={`https://socket.dev/npm/package/${selectedItem.name}`}
            target="_blank">
            Socket
          </AnchorLink>
          , providing reliable and up-to-date security intelligence.
        </p>
      </div>
    </section>
  )
}

export const InsightTabContent = () => {
  const insights = useSelectedItemStore(state => state.insights)
  const packageScore = useSelectedItemStore(
    state => state.packageScore,
  )
  const [filteredInsights, setFilteredInsights] = useState<
    SocketSecurityDetails[] | undefined
  >(insights)

  return (
    <TabsContent value="insights">
      <>
        {packageScore && <InsightScore />}

        {filteredInsights && filteredInsights.length > 0 && (
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
        )}
      </>

      {(!filteredInsights || filteredInsights.length === 0) && (
        <div className="flex h-64 w-full cursor-default items-center justify-center px-6 py-4">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div
              className={cn(
                'relative flex size-32 items-center justify-center rounded-full',
                !packageScore && !filteredInsights ?
                  'bg-secondary/60'
                : 'bg-emerald-500/20',
              )}>
              {!packageScore && !filteredInsights ?
                <BadgeInfo
                  className="absolute z-[3] size-14 text-neutral-500"
                  strokeWidth={1.25}
                />
              : <BadgeCheck
                  className="absolute z-[3] size-14 text-emerald-500"
                  strokeWidth={1.25}
                />
              }
            </div>
            <p className="w-2/3 text-pretty text-sm text-muted-foreground">
              {!packageScore && !filteredInsights ?
                'This package has not been scanned for insights.'
              : 'This package has no insights available.'}
            </p>
          </div>
        </div>
      )}

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
