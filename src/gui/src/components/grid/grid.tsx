import { forwardRef } from 'react'
import type { CSSProperties } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils.ts'

interface GridProps {
  rows: number
  columns: number
  children: React.ReactNode
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ rows, columns, children }, ref) => (
    <div
      ref={ref}
      className="grid-system"
      style={
        {
          '--rows': rows,
          '--columns': columns,
        } as CSSProperties
      }>
      <div className="grid-system-guides">
        {Array.from({ length: rows * columns }, (_, index) => {
          const x = (index % columns) + 1
          const y = Math.floor(index / columns) + 1
          return (
            <div
              key={index}
              className="grid-system-guide"
              style={
                {
                  '--x': x,
                  '--y': y,
                } as CSSProperties
              }
            />
          )
        })}
      </div>
      {children}
    </div>
  ),
)

interface GridSystemProps extends React.HTMLProps<HTMLDivElement> {
  className?: string
  children: React.ReactNode
}

export const System = forwardRef<HTMLDivElement, GridSystemProps>(
  ({ className = '', children }, ref) => {
    const gridVariants = cva('')

    return (
      <section ref={ref} className={cn(gridVariants({ className }))}>
        {children}
      </section>
    )
  },
)

interface CellProps {
  row?: number | string
  column: number
  children: React.ReactNode
}

export const Cell = forwardRef<HTMLDivElement, CellProps>(
  ({ row = 'auto', column, children }, ref) => (
    <div
      ref={ref}
      className="grid-system-cell"
      style={{ gridRow: row, gridColumn: column }}>
      {children}
    </div>
  ),
)

interface CrossProps {
  row: number
  column: number
}

export const Cross = forwardRef<HTMLDivElement, CrossProps>(
  ({ row, column }, ref) => (
    <div
      ref={ref}
      className="grid-system-cross"
      style={{ gridRow: row, gridColumn: column }}>
      <svg width={30} height={30}>
        <line
          x1={5}
          y1={15}
          x2={25}
          y2={15}
          stroke="#fafafa"
          strokeWidth={1}
        />
        <line
          x1={15}
          y1={5}
          x2={15}
          y2={25}
          stroke="#fafafa"
          strokeWidth={1}
        />
      </svg>
    </div>
  ),
)
