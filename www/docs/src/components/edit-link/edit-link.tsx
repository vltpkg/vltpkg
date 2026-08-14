import { PencilIcon } from 'lucide-react'
import type { Props } from '@astrojs/starlight/props'

export const EditLink = ({ editUrl }: Props) => {
  if (!editUrl) return null

  return (
    <a
      href={editUrl.toString()}
      className="text-sm text-muted-foreground no-underline transition-all hover:text-foreground">
      <span className="inline-flex items-center gap-2">
        <PencilIcon size={16} />
        Edit this page
      </span>
    </a>
  )
}
