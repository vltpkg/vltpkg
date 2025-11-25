import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { Link as GuiLink } from '@/components/ui/link.tsx'
import { Link as LucideLink, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils.ts'

import type { PropsWithChildren } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Variants, Transition } from 'framer-motion'
import type { DataBadgeProps } from '@/components/ui/data-badge.tsx'

interface AsideProps extends PropsWithChildren {
  className?: string
}

const Aside = ({ className, children }: AsideProps) => {
  return (
    <aside
      className={cn(
        'order-1 flex cursor-default flex-col gap-4 px-6 py-4 xl:order-2 xl:col-span-4',
        className,
      )}>
      {children}
    </aside>
  )
}

const AsideHeader = ({ children, className }: AsideProps) => {
  return (
    <h4
      className={cn(
        'text-muted-foreground text-sm font-medium capitalize',
        className,
      )}>
      {children}
    </h4>
  )
}

const AsideSection = ({ children, className }: AsideProps) => {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {children}
    </div>
  )
}

interface CopyIconProps {
  icon: LucideIcon
  copied: boolean
  hovered: boolean
}

const CopyIcon = ({ icon: Icon, copied, hovered }: CopyIconProps) => {
  const transitionMotion: Transition = {
    ease: 'easeInOut',
    duration: 0.125,
  }

  const iconMotion: Variants = {
    initial: { opacity: 0.05, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0.05, scale: 0.8 },
  }

  return (
    <span className="inline-flex items-center">
      <AnimatePresence mode="wait" initial={false}>
        {!hovered ?
          <motion.span
            key="default"
            variants={iconMotion}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-muted-foreground"
            transition={transitionMotion}>
            <Icon size={16} />
          </motion.span>
        : copied ?
          <motion.span
            key="check"
            variants={iconMotion}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-muted-foreground"
            transition={transitionMotion}>
            <Check size={16} className="my-auto" />
          </motion.span>
        : <motion.span
            key="copy"
            variants={iconMotion}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-muted-foreground"
            transition={transitionMotion}>
            <Copy size={16} className="my-auto" />
          </motion.span>
        }
      </AnimatePresence>
    </span>
  )
}

interface AsideItemProps extends AsideProps {
  href?: string
  icon?: LucideIcon
  count?: string | number
  type?: 'link' | 'email'
  copyToClipboard?: {
    copyValue: string
  }
  classNames?: {
    dataBadge: DataBadgeProps['classNames']
  }
  dataBadgeTooltip?: DataBadgeProps['tooltip']
}

const AsideItem = ({
  className,
  classNames,
  dataBadgeTooltip,
  children,
  href,
  icon: Icon,
  count,
  type,
  copyToClipboard,
}: AsideItemProps) => {
  const [copied, setCopied] = useState<boolean>(false)
  const [hovered, setHovered] = useState<boolean>(false)

  const MotionDiv = motion.div

  const { dataBadge } = classNames ?? {}

  const isLink = Boolean(href) || type === 'link'
  const isEmail = type === 'email'
  const El =
    isLink ? GuiLink
    : copyToClipboard ? MotionDiv
    : 'div'

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

  return (
    <El
      {...(isLink ? { href } : {})}
      {...(isEmail ? { href: `mailto:${href}` } : {})}
      {...(copyToClipboard ?
        {
          onClick: handleCopy,
          onHoverStart: () => setHovered(true),
          onHoverEnd: () => setHovered(false),
        }
      : {})}
      className={cn(
        'text-foreground flex items-center text-nowrap text-sm',
        !isLink && 'gap-2',
        className,
      )}>
      <span className="[&>svg]:text-muted-foreground flex items-center justify-center empty:hidden">
        {Icon && copyToClipboard && (
          <CopyIcon copied={copied} hovered={hovered} icon={Icon} />
        )}
        {Icon && !copyToClipboard && <Icon size={16} />}
        {!Icon && isLink && <LucideLink size={16} />}
      </span>
      {count && (
        <DataBadge
          classNames={dataBadge}
          tooltip={dataBadgeTooltip}
          variant="count"
          content={String(count)}
        />
      )}
      <span className="text-sm">{children}</span>
    </El>
  )
}

export { Aside, AsideHeader, AsideSection, AsideItem }
