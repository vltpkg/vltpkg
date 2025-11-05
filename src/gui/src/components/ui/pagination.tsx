import * as React from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils.ts'

const Pagination = ({
  className,
  ...props
}: React.ComponentProps<'nav'>) => {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}

const PaginationContent = ({
  className,
  ...props
}: React.ComponentProps<'ul'>) => {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  )
}

const PaginationItem = ({ ...props }: React.ComponentProps<'li'>) => {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
  size?: 'icon'
  disabled?: boolean
} & React.ComponentProps<'a'>

const PaginationLink = ({
  className,
  isActive,
  size,
  disabled,
  ...props
}: PaginationLinkProps) => {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        'ring-offset-background focus-visible:ring-ring inline-flex max-h-9 cursor-default items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 hover:border-neutral-300 hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
        size === 'icon' && 'size-9 px-3',
        isActive &&
          'border-neutral-300 bg-neutral-200 hover:border-neutral-400 hover:bg-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600 dark:hover:bg-neutral-700',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      {...props}
    />
  )
}

const PaginationPrevious = ({
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}>
      <ChevronLeftIcon className="text-neutral-500" />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  )
}

const PaginationNext = ({
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => {
  return (
    <PaginationLink
      aria-label="Go to next page"
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}>
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon className="text-neutral-500" />
    </PaginationLink>
  )
}

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<'span'>) => {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        'flex size-9 items-center justify-center',
        className,
      )}
      {...props}>
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
