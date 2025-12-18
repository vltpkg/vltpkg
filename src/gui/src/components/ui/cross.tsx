import { forwardRef } from 'react'
import { tv } from 'tailwind-variants'

import type { ComponentProps, CSSProperties } from 'react'
import type { VariantProps } from 'tailwind-variants'

const crossVariants = tv({
  base: 'absolute [shape-rendering:crispEdges] fill-background-secondary h-(--size) w-(--size)',
  variants: {
    debug: {
      true: '!fill-red-500',
    },
    top: {
      true: '-top-[0.5px] -translate-y-1/2',
    },
    right: {
      true: '-right-[0.5px] translate-x-1/2',
    },
    bottom: {
      true: '-bottom-[0.5px] translate-y-1/2',
    },
    left: {
      true: '-left-[0.5px] -translate-x-1/2',
    },
  },
})

type CrossProps = ComponentProps<'svg'> &
  VariantProps<typeof crossVariants> & { CROSS_SIZE?: number }

/**
 * The 'cross' component that is used as a decorator in between
 * borders to produce the convex 'diamond' like shape at intersections.
 *
 * By default there is a standard `CROSS_SIZE`.
 * Pass booleans: 'top', 'right', 'bottom', 'left' in order to position
 * the decorator in a `relative` parent container.
 *
 * Pass `debug` in order to change the color of the cross, this is
 * useful when assigning position on it.
 */
const Cross = forwardRef<SVGSVGElement, CrossProps>(
  (
    {
      className,
      top,
      right,
      bottom,
      left,
      style,
      debug,
      CROSS_SIZE = 8,
      ...props
    },
    ref,
  ) => {
    const constructedClasses = crossVariants({
      top,
      right,
      bottom,
      left,
      debug,
      class: className,
    })

    // Control point offset for convex curves
    // Smaller values = more rounded, larger values = sharper points
    const offset = 20
    const d = `
      M50 0
      Q${50 + offset} ${50 - offset} 100 50
      Q${50 + offset} ${50 + offset} 50 100
      Q${50 - offset} ${50 + offset} 0 50
      Q${50 - offset} ${50 - offset} 50 0
      Z
    `

    return (
      <svg
        aria-hidden
        ref={ref}
        viewBox="0 0 100 100"
        className={constructedClasses}
        {...props}
        style={
          {
            ...style,
            '--size': `${CROSS_SIZE}px`,
          } as CSSProperties
        }>
        <path d={d} />
      </svg>
    )
  },
)

Cross.displayName = 'Cross'

export { Cross }
