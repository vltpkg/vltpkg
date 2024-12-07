import { ChevronRight, ChevronLeft } from 'lucide-react'
import { type Props } from '@astrojs/starlight/props'

const Pagination = ({ pagination }: Props) => {
  const { next, prev } = pagination

  const navigateTo = (url: string) => {
    window.location.href = url
  }

  if (!next || !prev) return null

  return (
    <div className="mt-8 border-t-[1px] pt-8 flex w-full items-center justify-between">
      <div
        role="link"
        onClick={() => navigateTo(prev.href)}
        className="flex flex-col w-fit cursor-pointer text-right">
        <p className="text-sm text-muted-foreground">Previous</p>
        <div className="flex flex-row justify-between items-center w-full gap-2">
          <ChevronLeft size={20} />
          <p>{prev.label}</p>
        </div>
      </div>
      <div
        role="link"
        onClick={() => navigateTo(next.href)}
        className="flex flex-col w-fit cursor-pointer text-left">
        <p className="text-sm text-muted-foreground">Next</p>
        <div className="flex flex-row justify-between items-center w-full gap-2">
          <p>{next.label}</p>
          <ChevronRight size={20} />
        </div>
      </div>
    </div>
  )
}

export default Pagination
