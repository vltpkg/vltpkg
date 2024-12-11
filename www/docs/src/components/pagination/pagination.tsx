import { ChevronRight, ChevronLeft } from 'lucide-react'
import { type Props } from '@astrojs/starlight/props'

const Pagination = ({ pagination }: Props) => {
  const { next, prev } = pagination

  if (!next || !prev) return null

  return (
    <div className="mt-8 border-t-[1px] pt-8 flex w-full items-center justify-between">
      <a
        href={prev.href}
        className="no-underline flex flex-col w-fit cursor-pointer text-right">
        <p className="text-sm text-muted-foreground">Previous</p>
        <div className="flex flex-row justify-between items-center w-full gap-2 text-foreground">
          <ChevronLeft size={20} />
          <p>{prev.label}</p>
        </div>
      </a>
      <a
        href={next.href}
        className="no-underline flex flex-col w-fit cursor-pointer text-left">
        <p className="text-sm text-muted-foreground">Next</p>
        <div className="flex flex-row justify-between items-center w-full gap-2 text-foreground">
          <p>{next.label}</p>
          <ChevronRight size={20} />
        </div>
      </a>
    </div>
  )
}

export default Pagination
