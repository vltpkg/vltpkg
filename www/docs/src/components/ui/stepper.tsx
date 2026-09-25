'use client'

import * as React from 'react'
import { cn } from 'cn'

const Stepper = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...rest }, ref) => {
  return (
    <div
      data-slot="stepper"
      ref={ref}
      {...rest}
      className={cn('flex flex-col gap-6', className)}
    />
  )
})
Stepper.displayName = 'Stepper'

const StepperList = React.forwardRef<
  HTMLOListElement,
  React.ComponentProps<'ol'>
>(({ className, ...rest }, ref) => {
  return (
    <ol
      data-slot="stepper-list"
      ref={ref}
      {...rest}
      className={cn('flex flex-col gap-6', className)}
    />
  )
})
StepperList.displayName = 'StepperList'

const Step = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<'li'>
>(({ className, ...rest }, ref) => {
  return (
    <li
      data-slot="step"
      ref={ref}
      {...rest}
      className={cn(
        'grid list-none grid-cols-1 gap-3 md:grid-cols-[auto_4fr] md:gap-6 [&_:is(h1,h2,h3,h4,h5,h6)]:my-0',
        className,
      )}
    />
  )
})
Step.displayName = 'Step'

const StepCount = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<'span'>
>(({ className, children, ...rest }, forwardedRef) => {
  const localRef = React.useRef<HTMLSpanElement>(null)
  const lineRef = React.useRef<HTMLSpanElement>(null)

  React.useImperativeHandle<
    HTMLSpanElement | null,
    HTMLSpanElement | null
  >(forwardedRef, () => localRef.current, [])
  React.useLayoutEffect(() => {
    const current = localRef.current
    const line = lineRef.current
    if (!current || !line) return
    const updateLine = () => {
      const step = current.closest('[data-slot="step"]')
      const nextStep = step?.nextElementSibling
      const nextCount = nextStep?.querySelector(
        '[data-slot="step-count"]',
      ) as HTMLElement | null
      if (!nextCount) {
        line.style.display = 'none'
        return
      }
      const currentRect = current.getBoundingClientRect()
      const nextRect = nextCount.getBoundingClientRect()
      const height =
        nextRect.top +
        nextRect.height / 2 -
        (currentRect.top + currentRect.height)
      line.style.height = `${height}px`
    }
    updateLine()
    const resizeObserver = new ResizeObserver(updateLine)
    resizeObserver.observe(document.body)
    window.addEventListener('resize', updateLine)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateLine)
    }
  }, [])

  return (
    <span
      data-slot="step-count"
      ref={localRef}
      {...rest}
      className={cn(
        'bg-background relative flex size-8 items-center justify-center rounded-full border font-mono text-sm font-medium tabular-nums',

        className,
      )}>
      {children}
      <span
        ref={lineRef}
        aria-hidden
        className="bg-border absolute top-full left-1/2 hidden w-px -translate-x-1/2 md:block"
      />
    </span>
  )
})
StepCount.displayName = 'StepCount'

const StepContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'>
>(({ className, ...rest }, ref) => {
  return (
    <div
      data-slot="step-content"
      ref={ref}
      {...rest}
      className={cn('', className)}
    />
  )
})
StepContent.displayName = 'StepContent'

export { Stepper, StepperList, Step, StepCount, StepContent }
