import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button.tsx'
import {
  ChevronRight,
  ChevronLeft,
  Ellipsis,
  Triangle,
} from 'lucide-react'
import { Slot } from '@radix-ui/react-slot'
import { tv } from 'tailwind-variants'
import { cn } from '@/lib/utils.ts'

import type { VariantProps } from 'tailwind-variants'
import type { MotionProps } from 'framer-motion'

const tableVariants = tv({
  slots: {
    root: '',
    caption: [],
    body: '',
    row: '',
    cell: '',
    head: '',
    header: '',
  },
  variants: {
    variant: {
      table: {
        root: 'min-w-full flex flex-col border-t overflow-x-auto relative border-background-secondary',
        caption:
          'inline-flex items-start px-6 py-3 font-medium tracking-tight text-md',
        body: 'divide-y divide-background-secondary border-y border-background-secondary',
        row: 'bg-background py-3 px-6',
        cell: 'whitespace-nowrap',
        head: '',
        header: 'capitalize items-start inline-flex w-full text-sm',
      },
      list: {
        root: 'overflow-x-hidden relative border-background-secondary border-t flex flex-col',
        caption: [
          'inline-flex flex-wrap items-baseline px-6 pb-6 pt-12',
          'bg-clip-text text-3xl font-medium tracking-tight text-transparent',
          'bg-linear-to-tr from-neutral-500 to-neutral-950 dark:from-neutral-400 dark:to-neutral-50',
        ],
        body: 'flex flex-col gap-px py-px bg-background-secondary',
        row: 'bg-background transition-colors duration-100 hover:bg-background-secondary px-6 py-4 flex w-full rounded',
        cell: '',
        header: '',
      },
    },
  },
  defaultVariants: {
    variant: 'table',
  },
})

type TableVariantProps = VariantProps<typeof tableVariants>

const TableVariantContext =
  React.createContext<TableVariantProps['variant']>('table')

const useTableVariant = () => React.useContext(TableVariantContext)

const isTableVariant = (
  variant: TableVariantProps['variant'],
): variant is 'table' => variant === 'table'

const isListVariant = (
  variant: TableVariantProps['variant'],
): variant is 'list' => variant === 'list'

interface TableProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TableVariantProps['variant']
}

const Table = React.forwardRef<HTMLElement, TableProps>(
  ({ className, variant = 'table', children, ...props }, ref) => {
    const { root } = tableVariants({ variant })
    const El = isTableVariant(variant) ? 'table' : 'div'

    return (
      <TableVariantContext.Provider value={variant}>
        <El
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          ref={ref as any}
          className={cn(root(), className)}
          {...props}>
          {children}
        </El>
      </TableVariantContext.Provider>
    )
  },
)
Table.displayName = 'Table'

const TableCaption = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, children, ...props }, ref) => {
  const variant = useTableVariant()
  const { caption } = tableVariants({ variant })
  const El = isTableVariant(variant) ? 'caption' : 'h2'

  return (
    <El
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ref={ref as any}
      className={cn(caption(), className)}
      {...props}>
      {children}
    </El>
  )
})
TableCaption.displayName = 'TableCaption'

const TableHead = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => {
  const variant = useTableVariant()
  const { head } = tableVariants({ variant })

  if (isListVariant(variant)) {
    console.warn('TableHead is not supported with variant="list"')
    return null
  }

  return (
    <thead ref={ref} className={cn(head(), className)} {...props}>
      {children}
    </thead>
  )
})
TableHead.displayName = 'TableHead'

const TableBody = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & {
    alternateRows?: boolean
  }
>(({ className, children, alternateRows = false, ...props }, ref) => {
  const variant = useTableVariant()
  const { body } = tableVariants({ variant })
  const El = isTableVariant(variant) ? 'tbody' : 'ul'

  if (alternateRows && isListVariant(variant)) {
    console.warn('alternateRows is not supported with variant="list"')
  }

  return (
    <El
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ref={ref as any}
      className={cn(
        body(),
        alternateRows &&
          isTableVariant(variant) && [
            '[&>*:nth-child(odd)]:bg-background',
            '[&>*:nth-child(even)]:bg-background-secondary/30',
          ],
        className,
      )}
      {...props}>
      {children}
    </El>
  )
})
TableBody.displayName = 'TableBody'

const TableFooter = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => {
  const variant = useTableVariant()
  const El = isTableVariant(variant) ? 'tfoot' : 'div'

  return (
    <El
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ref={ref as any}
      className={className}
      {...props}
    />
  )
})
TableFooter.displayName = 'TableFooter'

const TableRow = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & {
    asChild?: boolean
  }
>(({ className, asChild = false, children, ...props }, ref) => {
  const variant = useTableVariant()
  const { row } = tableVariants({ variant })
  const El = isTableVariant(variant) ? 'tr' : 'li'
  const Comp = asChild ? Slot : El

  return (
    <Comp
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ref={ref as any}
      className={cn(row(), className)}
      {...props}>
      {children}
    </Comp>
  )
})
TableRow.displayName = 'TableRow'

const TableHeader = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, children, ...props }, ref) => {
  const variant = useTableVariant()
  const { header } = tableVariants({ variant })

  if (isListVariant(variant)) {
    console.warn('TableHeader is not supported with variant="list"')
    return null
  }

  return (
    <th ref={ref} className={cn(header(), className)} {...props}>
      {children}
    </th>
  )
})
TableHeader.displayName = 'TableHeader'

const TableHeaderSortingToggle = (
  props: React.ComponentProps<'button'> & {
    /** Whether this button supports sorting capabilities */
    enableSorting?: boolean
    /** The direction of the sort applied */
    dir?: 'asc' | 'desc'
    /** Whether this button is active */
    isActive?: boolean
  },
) => {
  const {
    className,
    children,
    disabled,
    dir,
    enableSorting = false,
    isActive = false,
    ...rest
  } = props

  return (
    <button
      disabled={disabled || !enableSorting}
      data-dir={dir}
      className={cn(
        'group/header-toggle text-muted-foreground inline-flex items-center gap-3 rounded-lg capitalize transition-colors duration-100 [&_svg]:size-4',
        isActive && 'text-foreground',
        enableSorting && [
          'hover:text-foreground relative z-2 cursor-pointer',
          'hover:after:bg-background-secondary after:absolute after:-inset-x-2.5 after:-inset-y-1.5 after:-z-1 after:rounded-lg after:bg-transparent after:transition-colors after:duration-100',
        ],
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      {...rest}>
      {children}
      {enableSorting && (
        <div
          className={cn(
            'gap-0.5px ml-auto flex flex-col',
            '**:data-[slot=icon]:fill-muted-foreground/50 **:data-[slot=icon]:size-2 **:data-[slot=icon]:stroke-transparent **:data-[slot=icon]:transition-[fill,stroke,colors] **:data-[slot=icon]:duration-100',
            'group-data-[dir=desc]/header-toggle:**:data-[dir=desc]:fill-primary **:data-[dir=desc]:rotate-180',
            'group-data-[dir=asc]/header-toggle:**:data-[dir=asc]:fill-primary',
            '',
          )}>
          <Triangle data-dir="asc" data-slot="icon" />
          <Triangle data-dir="desc" data-slot="icon" />
        </div>
      )}
    </button>
  )
}
TableHeaderSortingToggle.displayName = 'TableHeaderSortingToggle'

const TableCell = React.forwardRef<
  HTMLElement,
  React.TdHTMLAttributes<HTMLElement>
>(({ className, children, ...props }, ref) => {
  const variant = useTableVariant()
  const { cell } = tableVariants({ variant })
  const El = isTableVariant(variant) ? 'td' : 'div'

  return (
    <El
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ref={ref as any}
      className={cn(cell(), className)}
      {...props}>
      {children}
    </El>
  )
})
TableCell.displayName = 'TableCell'

const TableFilterList = ({
  className,
  children,
  ...rest
}: React.ComponentProps<'ul'>) => {
  const listRef = React.useRef<HTMLUListElement>(null)
  const [isAtStart, setIsAtStart] = React.useState<boolean>(true)
  const [isAtEnd, setIsAtEnd] = React.useState<boolean>(false)

  React.useEffect(() => {
    const listElement = listRef.current
    if (!listElement) return

    const updateScrollState = () => {
      const { scrollLeft, scrollWidth, clientWidth } = listElement
      setIsAtStart(scrollLeft <= 0)
      setIsAtEnd(scrollLeft >= scrollWidth - clientWidth - 1) // -1 for rounding
    }

    // Initial check
    updateScrollState()

    // Listen to scroll events
    listElement.addEventListener('scroll', updateScrollState)

    // Listen to resize events (in case content changes)
    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(listElement)

    return () => {
      listElement.removeEventListener('scroll', updateScrollState)
      resizeObserver.disconnect()
    }
  }, [])

  const scrollToStart = () => {
    const listElement = listRef.current
    if (listElement) {
      listElement.scrollTo({ left: 0, behavior: 'smooth' })
    }
  }

  const scrollToEnd = () => {
    const listElement = listRef.current
    if (listElement) {
      const { scrollWidth, clientWidth } = listElement
      listElement.scrollTo({
        left: scrollWidth - clientWidth,
        behavior: 'smooth',
      })
    }
  }

  return (
    <ul
      ref={listRef}
      className={cn(
        'border-background-secondary bg-background-secondary relative flex w-full flex-col items-center gap-px overflow-x-scroll border-t lg:h-[45px] lg:flex-row',
        className,
      )}
      {...rest}>
      <AnimatePresence>
        {!isAtStart && (
          <MotionScrollHelper
            align="start"
            onClick={scrollToStart}
            {...scrollHelperMotion}>
            <ChevronLeft />
          </MotionScrollHelper>
        )}
      </AnimatePresence>
      {children}
      <AnimatePresence>
        {!isAtEnd && (
          <MotionScrollHelper
            align="end"
            onClick={scrollToEnd}
            {...scrollHelperMotion}>
            <ChevronRight />
          </MotionScrollHelper>
        )}
      </AnimatePresence>
    </ul>
  )
}
TableFilterList.displayName = 'TableFilterList'

const scrollHelperMotion: MotionProps = {
  initial: { opacity: 0, filter: 'blur(2px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(2px)' },
}

const ScrollHelper = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button> & { align: 'start' | 'end' }
>(({ className, align, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      className={cn(
        'bg-background/50 absolute z-10 flex aspect-square h-full items-center justify-center rounded backdrop-blur-sm [&_svg]:size-4',
        align === 'start' && 'top-0 left-0',
        align === 'end' && 'top-0 right-0',
        className,
      )}
      {...props}
    />
  )
})
ScrollHelper.displayName = 'ScrollHelper'

const MotionScrollHelper = motion.create(ScrollHelper)

const TableFilterListItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<'li'>
>(({ className, ...rest }, ref) => (
  <li
    ref={ref}
    className={cn(
      'inline-flex h-full w-full items-center justify-center',
      className,
    )}
    {...rest}
  />
))
TableFilterListItem.displayName = 'TableFilterListItem'

const TableFilterListButton = (
  props: React.ComponentProps<'button'> & {
    /** Whether this button supports sorting capabilities */
    enableSorting?: boolean
    /** The direction of the sort applied */
    dir?: 'asc' | 'desc'
    /** Whether this button is active */
    isActive?: boolean
  },
) => {
  const {
    className,
    children,
    disabled,
    dir,
    enableSorting = false,
    isActive = false,
    ...rest
  } = props

  return (
    <button
      disabled={disabled || !enableSorting}
      data-dir={dir}
      className={cn(
        'group/list-button text-muted-foreground bg-background not-disabled:hover:bg-background-secondary inline-flex h-full w-full min-w-[200px] items-center gap-2 rounded px-6 py-3 text-sm font-medium text-nowrap transition-colors duration-100',
        '[&_svg]:size-4.5',
        enableSorting && 'cursor-pointer',
        isActive && 'text-foreground bg-background-secondary/50',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      {...rest}>
      {children}
      {enableSorting && (
        <div
          className={cn(
            'ml-auto flex flex-col gap-0.5',
            '[&_svg]:fill-muted-foreground/50 [&_svg]:stroke-transparent [&_svg]:transition-[stroke,fill] [&_svg]:duration-100',
            '**:data-[slot=icon]:size-2',
            'group-data-[dir=asc]/list-button:**:data-[dir=asc]:fill-primary',
            'group-data-[dir=desc]/list-button:**:data-[dir=desc]:fill-primary **:data-[dir=desc]:rotate-180',
          )}>
          <Triangle data-dir="asc" data-slot="icon" />
          <Triangle data-dir="desc" data-slot="icon" />
        </div>
      )}
    </button>
  )
}
TableFilterListButton.displayName = 'TableFilterListButton'

const TablePaginationList = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<'ul'>
>(({ className, ...rest }, ref) => (
  <ul
    ref={ref}
    data-slot="pagination-list"
    className={cn(
      'bg-background-secondary flex h-[45px] w-full items-center gap-px',
      className,
    )}
    {...rest}
  />
))
TablePaginationList.displayName = 'TablePaginationList'

const TablePaginationListItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<'li'>
>(({ className, ...rest }, ref) => (
  <li
    ref={ref}
    data-slot="pagination-list-item"
    className={cn('flex h-full w-full items-center', className)}
    {...rest}
  />
))
TablePaginationListItem.displayName = 'TablePaginationListItem'

const TablePaginationListButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    as?: 'previous' | 'next' | 'ellipsis' | 'number'
    /** Whether the page is currently active */
    active?: boolean
    /** If the scroll position should be reset to the top of the window */
    resetScrollPosition?: boolean
  }
>(
  (
    {
      className,
      active = false,
      disabled,
      as = 'number',
      children,
      resetScrollPosition = true,
      onClick,
      ...rest
    },
    ref,
  ) => (
    <button
      data-slot="pagination-list-button"
      ref={ref}
      disabled={disabled}
      onClick={
        resetScrollPosition && onClick ?
          e => {
            onClick(e)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        : onClick
      }
      className={cn(
        'group/pagination-item text-muted-foreground bg-background inline-flex h-full w-full cursor-pointer items-center justify-center gap-2 rounded px-6 py-3 text-sm font-medium [&_svg]:size-4',
        'hover:bg-background-secondary transition-colors duration-100 **:data-[slot=icon]:transition-all **:data-[slot=icon]:duration-100',
        active && 'text-foreground bg-background-secondary/50',
        disabled && 'cursor-not-allowed opacity-50',
        as === 'ellipsis' && 'cursor-not-allowed opacity-50',
        className,
      )}
      {...rest}>
      {as === 'previous' && (
        <ChevronLeft
          data-slot="icon"
          className={cn(
            !disabled && 'group-hover/pagination-item:-translate-x-1',
          )}
        />
      )}
      {as === 'ellipsis' ?
        <Ellipsis data-slot="ellipsis" />
      : children}
      {as === 'next' && (
        <ChevronRight
          data-slot="icon"
          className={cn(
            !disabled && 'group-hover/pagination-item:translate-x-1',
          )}
        />
      )}
    </button>
  ),
)
TablePaginationListButton.displayName = 'TablePaginationListButton'

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableHeaderSortingToggle,
  TableRow,
  TableFilterList,
  TableFilterListItem,
  TableFilterListButton,
  TablePaginationList,
  TablePaginationListItem,
  TablePaginationListButton,
}
