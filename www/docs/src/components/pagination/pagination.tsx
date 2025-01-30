import { ChevronRight, ChevronLeft } from 'lucide-react'
import { type Props } from '@astrojs/starlight/props'

const Pagination = ({ pagination }: Props) => {
  const { next, prev } = pagination

  if (!next || !prev) return null

  return (
    <div className="mt-8 flex w-full items-center justify-between border-t-[1px] pt-8">
      <a
        href={prev.href}
        className="flex w-fit cursor-pointer flex-col text-right no-underline">
        <p className="text-sm text-muted-foreground">Previous</p>
        <div className="flex w-full flex-row items-center justify-between gap-2 text-foreground">
          <ChevronLeft size={20} />
          <p>{prev.label}</p>
        </div>
      </a>
      <a
        href={next.href}
        className="flex w-fit cursor-pointer flex-col text-left no-underline">
        <p className="text-sm text-muted-foreground">Next</p>
        <div className="flex w-full flex-row items-center justify-between gap-2 text-foreground">
          <p>{next.label}</p>
          <ChevronRight size={20} />
        </div>
      </a>
    </div>
  )
}

export default Pagination
