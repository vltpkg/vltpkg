import { cn } from '@/lib/utils.ts'

export function Icon({
  name,
  alt,
  className,
  preserveAspectRatio = 'xMinYMin',
  ...props
}: {
  name?: string
  alt?: string
  className?: string
  preserveAspectRatio?: string
}) {
  return (
    <svg
      {...{
        preserveAspectRatio,
        'aria-hidden': !alt ? true : undefined,
        role: alt ? 'img' : 'presentation',
        title: alt,
        'aria-label': alt || undefined,
        focusable: 'false',
        className: cn('flex-shrink-0', className),
      }}
      {...props}>
      <use href={`/icons/sprite.svg#${name}`} />
    </svg>
  )
}
