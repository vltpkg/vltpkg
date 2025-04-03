import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import {
  getAlertColor,
  InsightBadge,
} from '@/components/explorer-grid/selected-item/insight-badge.jsx'

export const Insights = () => {
  const { insights } = useSelectedItem()

  if (!insights || insights.length === 0) return null

  return (
    <section className="flex w-full flex-wrap gap-3 px-6 pb-6">
      {insights.map((insight, idx) => (
        <InsightBadge
          key={idx}
          color={getAlertColor(insight.severity)}
          tooltipContent={`${insight.severity} severity`}>
          {insight.selector}
        </InsightBadge>
      ))}
    </section>
  )
}
