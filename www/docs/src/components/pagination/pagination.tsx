import type { Props } from '@astrojs/starlight/props'
import { Button } from '@/components/ui/button.tsx'

export const Pagination = ({ pagination }: Props) => {
  const { next, prev } = pagination

  if (!next || !prev) return null

  return (
    <div className="mt-8 grid h-full w-full grid-cols-2 items-center gap-2 pt-8">
      <Button
        variant="outline"
        className="duration-250 group h-20 w-full cursor-pointer items-start hover:text-foreground"
        asChild>
        <a
          href={prev.href}
          className="flex flex-col gap-2 text-sm text-neutral-700 no-underline dark:text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            Previous
          </span>
          <span>{prev.label}</span>
        </a>
      </Button>

      <Button
        variant="outline"
        className="duration-250 group h-20 w-full cursor-pointer items-end hover:text-foreground"
        asChild>
        <a
          href={prev.href}
          className="flex flex-col gap-2 text-sm text-neutral-700 no-underline dark:text-muted-foreground">
          <span className="inline-flex items-center gap-1">Next</span>
          <span>{next.label}</span>
        </a>
      </Button>
    </div>
  )
}
