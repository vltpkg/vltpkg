import * as React from 'react'
import { LoaderIcon } from 'lucide-react'
import { cn } from '@/lib/utils.js'

const spinnerVariants = 'w-6 h-6 rounded-full animate-spin'

interface LoadingSpinnerProps
  extends React.HTMLAttributes<SVGSVGElement> {
  className?: string
}

const LoadingSpinner = React.forwardRef<
  SVGSVGElement,
  LoadingSpinnerProps
>((props, ref) => {
  const { className, ...rest } = props
  return (
    <LoaderIcon
      ref={ref}
      className={cn(spinnerVariants, className)}
      {...rest}
    />
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'

export { LoadingSpinner }
