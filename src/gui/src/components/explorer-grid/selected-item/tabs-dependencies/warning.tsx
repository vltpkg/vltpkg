import { AlertTriangle } from 'lucide-react'
import { severityStyles } from '@/components/explorer-grid/selected-item/tabs-dependencies/helpers.ts'
import { cn } from '@/lib/utils.ts'
import type { SocketSecurityDetails } from '@/lib/constants/index.ts'
import type { LucideIcon } from 'lucide-react'

export const Warning = ({
  warning,
  onClick,
  className,
  count,
  severity = 'high',
  icon: Icon = AlertTriangle,
  hideIcon = false,
}: {
  warning: string
  onClick?: () => void
  count?: number
  className?: string
  severity?: SocketSecurityDetails['severity']
  icon?: LucideIcon
  hideIcon?: boolean
}) => {
  return (
    <div
      role="button"
      {...(onClick ? { onClick } : undefined)}
      className={cn(
        'duration-250 flex cursor-default items-center justify-between rounded-md border-[1px] bg-transparent px-3 py-2 transition-colors',
        severityStyles[severity].background,
        severityStyles[severity].border,
        className,
      )}>
      {!hideIcon && (
        <span
          className={cn(
            'mb-0.5 mr-1.5 flex items-center justify-center',
            severityStyles[severity].text,
          )}>
          <Icon size={16} />
        </span>
      )}
      <p
        className={cn(
          'inline-flex items-baseline gap-1.5 text-sm font-medium',
          severityStyles[severity].text,
        )}>
        {count !== undefined && (
          <span className="font-mono tabular-nums">{count}</span>
        )}
        {warning}
      </p>
    </div>
  )
}
