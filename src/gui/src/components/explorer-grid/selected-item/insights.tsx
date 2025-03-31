import { useSelectedItem } from '@/components/explorer-grid/selected-item/context.jsx'
import {
  getAlertColor,
  InsightBadge,
} from '@/components/explorer-grid/selected-item/insight-badge.jsx'
import { SOCKET_SECURITY_DETAILS } from '@/lib/constants/index.js'
import type { SocketSecurityDetails } from '@/lib/constants/index.js'
import type { State } from '@/state/types.js'
import type { GridItemData } from '@/components/explorer-grid/types.js'

export const getSecurityAlerts = (
  item: GridItemData,
  securityArchive: State['securityArchive'],
): SocketSecurityDetails[] | undefined => {
  if (!securityArchive) return

  const securityAlerts = new Map<string, SocketSecurityDetails>()
  const depId = item.to?.id
  if (depId) {
    const depAlerts = securityArchive.get(depId)?.alerts
    if (depAlerts && depAlerts.length > 0) {
      for (const alert of depAlerts) {
        const match = SOCKET_SECURITY_DETAILS[alert.type]

        if (match) {
          securityAlerts.set(alert.type, {
            selector: match.selector,
            description: match.description,
            category: match.category,
            severity: match.severity,
          })
        }
      }
    }
  }

  return Array.from(securityAlerts.values())
}

export const Insights = () => {
  const { selectedItem, securityArchive } = useSelectedItem()

  const securityAlerts = getSecurityAlerts(
    selectedItem,
    securityArchive,
  )

  if (!securityAlerts || securityAlerts.length === 0) return null

  return (
    <section className="flex w-full flex-wrap gap-3 px-6 pb-6">
      {securityAlerts.map((alert, idx) => (
        <InsightBadge
          key={idx}
          color={getAlertColor(alert.severity)}
          tooltipContent={`${alert.severity} severity`}>
          {alert.selector}
        </InsightBadge>
      ))}
    </section>
  )
}
