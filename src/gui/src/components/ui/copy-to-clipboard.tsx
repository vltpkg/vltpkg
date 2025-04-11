import { motion, AnimatePresence } from 'framer-motion'
import React from 'react'
import { Copy, Check } from 'lucide-react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip.jsx'
import { cn } from '@/lib/utils.js'

const copyToClipboardVariants = cva(
  'inline-flex cursor-default transition-colors duration-150 gap-2 h-7 rounded-sm px-3 py-1.5 text-sm font-courier truncate bg-secondary text-muted-foreground items-center justify-center',
)

type CopyToClipboardProps = React.HTMLProps<HTMLButtonElement> &
  VariantProps<typeof copyToClipboardVariants> & {
    children?: React.ReactNode
    copyValue?: string
    toolTipText?: string
  }

const CopyToClipboard = React.forwardRef<
  HTMLButtonElement,
  CopyToClipboardProps
>(({ children, className, copyValue, toolTipText }, ref) => {
  const [copied, setCopied] = React.useState<boolean>(false)

  const handleCopy = async () => {
    if (!copyValue) return
    try {
      await navigator.clipboard.writeText(copyValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy!', err)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <button
            ref={ref}
            className={cn(copyToClipboardVariants({ className }))}
            onClick={copyValue ? handleCopy : undefined}>
            {children}
            <span className="ml-auto flex items-center justify-center">
              <AnimatePresence mode="wait" initial={false}>
                {copied ?
                  <motion.span
                    key="check"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      type: 'spring',
                      duration: 0.175,
                      bounce: 0.2,
                    }}
                    className="inline-block">
                    <Check className="my-auto" size={14} />
                  </motion.span>
                : <motion.span
                    key="copy"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      type: 'spring',
                      duration: 0.175,
                      bounce: 0.2,
                    }}
                    className="inline-block">
                    <Copy className="my-auto" size={14} />
                  </motion.span>
                }
              </AnimatePresence>
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>{toolTipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})
CopyToClipboard.displayName = 'CopyToClipboard'

export { CopyToClipboard }
