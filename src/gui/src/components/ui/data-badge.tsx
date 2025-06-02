import { useState, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { Copy, Check } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip.tsx'

import { cn } from '@/lib/utils.ts'
import { tv } from 'tailwind-variants'

import type { LucideIcon } from 'lucide-react'
import type { Transition, Variants } from 'framer-motion'
import type { VariantProps } from 'tailwind-variants'
import type { CSSProperties } from 'react'

/**
 * We prefer to use `tailwind-variants` instead of `class-variance-authority`
 * for this component because we're able to use the `slots` feature to
 * create a more complex structure.
 */
const dataBadgeVariants = tv({
  slots: {
    wrapperSlot: 'group font-sans',
    valueSlot: 'tabular-nums',
    iconSlot: '',
    contentSlot: '',
  },
  variants: {
    variant: {
      default: {
        wrapperSlot:
          'relative z-[1] w-fit flex h-full cursor-default items-center justify-center gap-1.5 rounded border-[1px] border-neutral-200 bg-neutral-100 px-2 py-1 text-[0.75rem] font-medium text-muted-foreground dark:border-[#313131] dark:bg-neutral-800',
        valueSlot:
          'after:border-[var(--light-border)] pt-0.5 font-courier relative ml-[0.125rem] mr-[calc(var(--width-offset)/2)] uppercase tracking-wide text-neutral-700 after:absolute after:-left-[calc(var(--width-offset)/2)] after:-top-[calc(var(--height-offset)/2)] after:z-[-1] after:h-[calc(100%+var(--height-offset))] after:w-[calc(100%+var(--width-offset))] after:rounded-[calc(0.25rem-1px)] after:border-[1px] after:bg-[var(--light-background)] after:content-[""] group-has-[span[data-id=info-badge-icon]]:ml-[calc(var(--width-offset)/2)] dark:text-foreground dark:after:border-[var(--dark-border)] dark:after:bg-[var(--dark-background)]',
        iconSlot: 'flex w-4 items-center justify-center',
        contentSlot: 'flex items-center justify-center',
      },
      mono: {
        wrapperSlot:
          'font-courier relative z-[1] w-fit flex h-full cursor-default items-center justify-center gap-1.5 rounded border-[1px] border-neutral-200 bg-neutral-100 px-2 py-1 text-[0.75rem] font-medium text-muted-foreground dark:border-[#313131] dark:bg-neutral-800',
      },
      count: {
        wrapperSlot:
          'group font-courier relative z-[1] w-fit inline-flex h-[1.25rem] min-w-[1.25rem] cursor-default items-center justify-center gap-1.5 rounded border-[1px] border-neutral-200 bg-neutral-100 p-1 text-[0.75rem] font-medium text-muted-foreground dark:border-[#313131] dark:bg-neutral-800',
        contentSlot: 'flex items-center pt-0.5 justify-center',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

interface DataBadgeProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof dataBadgeVariants> {
  classNames?: {
    wrapperClassName?: string
    iconWrapperClassName?: string
    iconClassName?: string
    valueClassName?: string
    contentClassName?: string
  }
  styles?: {
    valueStyles?: CSSProperties
  }
  icon?: LucideIcon
  value?: React.ReactNode
  content: string
  tooltip?: {
    content: string
    delayDuration?: number
  }
  copyToClipboard?: {
    copyValue: string
  }
}

const CopyIcon = ({ copied }: { copied: boolean }) => {
  const iconMotion: Variants & Transition = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { type: 'spring', duration: 0.175, bounce: 0.2 },
  }

  return (
    <span
      data-id="info-badge-copy-icon"
      className="flex w-4 items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={copied ? 'check' : 'copy'} {...iconMotion}>
          {copied ?
            <Check size={14} className="my-auto" />
          : <Copy size={14} className="my-auto" />}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

const Content = forwardRef<
  HTMLDivElement,
  DataBadgeProps & {
    handleCopy?: () => void
    copied: boolean
  }
>(
  (
    {
      copyToClipboard,
      classNames,
      className,
      value,
      content,
      copied,
      onClick,
      variant,
      icon: Icon,
      ...props
    },
    ref,
  ) => {
    const { wrapperSlot, iconSlot, valueSlot, contentSlot } =
      dataBadgeVariants({ variant })

    return (
      <div
        ref={ref}
        {...(copyToClipboard ? { role: 'button', onClick } : {})}
        className={cn(wrapperSlot(), classNames?.wrapperClassName)}
        {...props}>
        {Icon && (
          <span
            data-id="info-badge-icon"
            className={cn(
              iconSlot(),
              classNames?.iconWrapperClassName,
            )}>
            <Icon
              size={16}
              className={cn(
                'dark:text-muted-foreground',
                classNames?.iconClassName,
              )}
            />
          </span>
        )}

        {value && (
          <span
            data-id="info-badge-value"
            className={cn(valueSlot(), classNames?.valueClassName)}
            style={
              {
                '--width-offset': '1rem',
                '--height-offset': '0.25rem',
                '--dark-background': '#0F0F0F',
                '--dark-border': '#2A2A2A',
                '--light-background': '#FFFFFF',
                '--light-border': '#E4E4E7',
                ...props.styles?.valueStyles,
              } as React.CSSProperties
            }>
            {value}
          </span>
        )}

        <span
          className={cn(contentSlot(), classNames?.contentClassName)}>
          {content}
        </span>

        {copyToClipboard && <CopyIcon copied={copied} />}
      </div>
    )
  },
)
Content.displayName = 'DataBadgeContent'

export const DataBadge = ({
  copyToClipboard,
  tooltip,
  ...rest
}: DataBadgeProps) => {
  const [copied, setCopied] = useState<boolean>(false)

  const handleCopy = async () => {
    if (!copyToClipboard) return
    try {
      await navigator.clipboard.writeText(copyToClipboard.copyValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy!', err)
    }
  }

  const badgeContent = (
    <Content
      {...rest}
      copyToClipboard={copyToClipboard}
      copied={copied}
      onClick={handleCopy}
    />
  )

  return tooltip ?
      <TooltipProvider>
        <Tooltip delayDuration={tooltip.delayDuration ?? 150}>
          <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
          <TooltipContent>{tooltip.content}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    : badgeContent
}
DataBadge.displayName = 'DataBadge'
