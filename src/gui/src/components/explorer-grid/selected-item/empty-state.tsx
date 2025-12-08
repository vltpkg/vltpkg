import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
  EmptyHeader,
} from '@/components/ui/empty-state.tsx'

import type { ReactElement } from 'react'
import type { LucideIcon } from 'lucide-react'

interface SelectedItemEmptyStateProps {
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
}: SelectedItemEmptyStateProps) => {
  return (
    <Empty className="h-fit items-center justify-start">
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
