import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
  EmptyHeader,
} from '@/components/ui/empty-state.tsx'
import { cn } from '@/lib/utils.ts'

import type { ReactElement, ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'

type SelectedItemEmptyStateProps = ComponentProps<typeof Empty> & {
  icon: LucideIcon
  title: string
  description: string
  content?: ReactElement
}

export const SelectedItemEmptyState = ({
  icon: Icon,
  title,
  description,
  content,
  className,
  ...rest
}: SelectedItemEmptyStateProps) => {
  return (
    <Empty
      className={cn('h-fit items-center justify-start', className)}
      {...rest}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription className="whitespace-pre-wrap">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {content && <EmptyContent>{content}</EmptyContent>}
    </Empty>
  )
}
