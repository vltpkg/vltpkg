import { tv } from 'tailwind-variants'
import { cn } from '@/lib/utils.ts'

import type { VariantProps } from 'tailwind-variants'
import type { DependencyTypeShort } from '@vltpkg/types'

interface RelationBadgeProps
  extends
    React.PropsWithChildren,
    VariantProps<typeof relationBadgeVariants> {
  classNames?: {
    wrapper?: string
    text?: string
  }
  onClick?: () => void
  hover?: boolean
}

export type Relation = DependencyTypeShort | 'undefined' | 'workspace'

type RelationStyle = Record<
  Relation,
  {
    background: string
    border: string
    text: string
    hover: string
  }
>

export const relationStyles: RelationStyle = {
  undefined: {
    background: 'bg-gray-100',
    border: 'border-[1px] border-neutral-900',
    hover: 'hover:bg-gray-100/80',
    text: 'text-neutral-900',
  },
  peer: {
    background: 'bg-fuchsia-100 dark:bg-fuchsia-950',
    border: 'border-[1px] border-fuchsia-500 dark:border-fuchsia-500',
    hover: 'hover:bg-fuchsia-400/20 dark:hover:bg-fuchsia-500/20',
    text: 'text-fuchsia-800 dark:text-fuchsia-400',
  },
  peerOptional: {
    background: 'bg-pink-100 dark:bg-pink-950',
    border: 'border-[1px] border-pink-500 dark:border-pink-500',
    hover: 'hover:bg-pink-400/20 dark:hover:bg-pink-500/20',
    text: 'text-pink-800 dark:text-pink-400',
  },
  dev: {
    background: 'bg-orange-200 dark:bg-orange-950',
    border: 'border-[1px] border-orange-500 dark:border-orange-500',
    hover: 'hover:bg-orange-400/20 dark:hover:bg-orange-500/20',
    text: 'text-orange-700 dark:text-orange-500',
  },
  prod: {
    background: 'bg-blue-200 dark:bg-blue-950',
    border: 'border-[1px] border-blue-500 dark:border-blue-500',
    hover: 'hover:bg-blue-400/20 dark:hover:bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-400',
  },
  optional: {
    background: 'bg-emerald-200 dark:bg-emerald-950',
    border: 'border-[1px] border-emerald-500 dark:border-emerald-500',
    hover: 'hover:bg-emerald-400/20 dark:hover:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-500',
  },
  workspace: {
    background: 'bg-gray-500/25 dark:bg-gray-500/30',
    border: 'border-[1px] border-gray-600 dark:border-gray-400',
    hover: 'hover:bg-gray-400/40 dark:hover:bg-gray-500/40',
    text: 'text-gray-600 dark:text-gray-400',
  },
}

const relationBadgeVariants = tv({
  slots: {
    badgeSlot:
      'relative flex px-2 items-center justify-center h-[19px] rounded-full cursor-default w-fit',
    textSlot:
      'text-xs font-medium inline-flex items-center justify-center',
  },
  variants: {
    variant: {
      default: {
        badgeSlot: '',
        textSlot: '',
      },
      marker: {
        badgeSlot: 'size-2 rounded-full',
        textSlot: 'hidden',
      },
    },
    relation: Object.fromEntries(
      Object.entries(relationStyles).map(([key, value]) => [
        key,
        {
          badgeSlot: `${value.background} ${value.border}`,
          textSlot: value.text,
        },
      ]),
    ),
  },
})

export const RelationBadge = ({
  classNames,
  children,
  variant,
  relation,
  onClick,
  hover = false,
}: RelationBadgeProps) => {
  const { wrapper, text } = classNames ?? {}
  const { badgeSlot, textSlot } = relationBadgeVariants({
    variant,
    relation,
  })

  return (
    <div
      onClick={onClick}
      className={cn(
        badgeSlot(),
        variant === 'marker' && 'm-0 inline-block p-0',
        wrapper,
        hover &&
          relationStyles[
            (relation ?? 'undefined') as keyof typeof relationStyles
          ].hover,
      )}>
      {variant !== 'marker' && (
        <span className={cn(textSlot(), text)}>{children}</span>
      )}
    </div>
  )
}
