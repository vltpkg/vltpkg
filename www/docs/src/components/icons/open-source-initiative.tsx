import Image from 'next/image'
import { cn } from 'cn'

/** Open Source Initiative-style mark (`public/images/marketing/open-source-initiative.png`). */
export const OpenSourceInitiative = ({
  className,
  decorative = true,
}: {
  className?: string
  decorative?: boolean
}) => (
  <Image
    src="/images/marketing/open-source-initiative.png"
    alt={decorative ? '' : 'Open Source Initiative'}
    width={32}
    height={32}
    aria-hidden={decorative || undefined}
    className={cn('object-contain dark:invert', className)}
  />
)
