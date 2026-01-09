import { forwardRef } from 'react'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty-state.tsx'
import { cn } from '@/lib/utils.ts'

import type { ReactNode, ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'

export const EmptyState = forwardRef<
  HTMLDivElement,
  Omit<ComponentProps<typeof Empty>, 'content'> & {
    icon: LucideIcon
    title: string
    description?: string
    content?: ReactNode
  }
>(
  (
    { className, icon: Icon, title, description, content, ...rest },
    ref,
  ) => {
    return (
      <Empty
        className={cn(
          'bg-background h-full w-full rounded border-none',
          className,
        )}
        ref={ref}
        {...rest}>
        <EmptyContent>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon />
            </EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            {description && (
              <EmptyDescription>{description}</EmptyDescription>
            )}
            {content && content}
          </EmptyHeader>
        </EmptyContent>
      </Empty>
    )
  },
)
EmptyState.displayName = 'EmptyState'
