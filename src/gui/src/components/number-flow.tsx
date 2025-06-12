import {
  motion,
  useMotionValue,
  animate,
  AnimatePresence,
} from 'framer-motion'
import { useEffect, useState, forwardRef } from 'react'
import { cn } from '@/lib/utils.ts'
import { tv } from 'tailwind-variants'

import type { Variants, Transition } from 'framer-motion'
import type { VariantProps } from 'tailwind-variants'

const numberFlowVariants = tv({
  slots: {
    wrapper: '',
    p: '',
    span: '',
  },
  variants: {
    variant: {
      default: {
        wrapper: 'inline-flex',
        p: 'overflow-hidden',
        span: 'inline-block text-sm text-current tabular-nums font-mono',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

type NumberFlowProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof numberFlowVariants> & {
    start: number
    end: number
    format?: {
      pad?: number
    }
    motionConfig?: {
      duration?: number
      yValue?: number
      blurValue?: number
    }
    classNames?: {
      wrapper?: string
      p?: string
      span?: string
    }
  }

const NumberFlow = forwardRef<HTMLDivElement, NumberFlowProps>(
  (
    {
      className,
      variant,
      start,
      end,
      motionConfig,
      format,
      classNames,
      ...props
    },
    ref,
  ) => {
    const motionValue = useMotionValue<number>(start)
    const [dir, setDir] = useState<'up' | 'down'>('up')
    const [displayNumber, setDisplayNumber] = useState<number>(start)

    const { wrapper, p, span } = numberFlowVariants({ variant })

    const { pad = 2 } = format ?? {}
    const {
      duration = 2,
      yValue = 2,
      blurValue = 1,
    } = motionConfig ?? {}

    const digitVariants: Variants & Transition = {
      initial: (dir: 'up' | 'down') => ({
        y: dir === 'up' ? yValue : -yValue,
        filter: `blur(${blurValue}px)`,
        opacity: 0,
      }),
      animate: {
        y: '0px',
        filter: 'blur(0px)',
        opacity: 1,
      },
      exit: (dir: 'up' | 'down') => ({
        y: dir === 'up' ? -yValue : yValue,
        filter: `blur(${blurValue}px)`,
        opacity: 0,
      }),
      transition: {
        type: 'spring',
        bounce: 0.35,
        duration: 0.3,
      },
    }

    useEffect(() => {
      setDir(end > start ? 'up' : 'down')

      const controls = animate(motionValue, end, {
        duration,
        ease: 'easeInOut',
        onUpdate: latest => {
          setDisplayNumber(Math.round(latest))
        },
      })

      return controls.stop
    }, [start, end, duration, motionValue])

    const paddedDigits = displayNumber
      .toString()
      .padStart(pad, '0')
      .split('')

    return (
      <div
        ref={ref}
        className={cn(wrapper(), classNames?.wrapper, className)}
        data-id="number-flow-wrapper"
        {...props}>
        <p data-id="number-flow-p" className={cn(p(), classNames?.p)}>
          <AnimatePresence mode="popLayout" initial={false}>
            {paddedDigits.map((n, i) => (
              <motion.span
                data-key={`number-flow-span-${n}-${i}`}
                key={`${i}-${n}`}
                custom={dir}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={digitVariants}
                className={cn(span(), classNames?.span)}
                style={{
                  originY: '0px',
                }}>
                {n}
              </motion.span>
            ))}
          </AnimatePresence>
        </p>
      </div>
    )
  },
)

NumberFlow.displayName = 'NumberFlow'

export { NumberFlow }
