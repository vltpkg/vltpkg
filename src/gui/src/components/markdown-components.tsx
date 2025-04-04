import type { Components } from 'react-markdown'
import { ArrowUpRight } from 'lucide-react'

export const markdownComponents: Components = {
  a: props => {
    const { children, ...rest } = props

    return (
      <a
        {...rest}
        target="_blank"
        className="group relative inline-flex text-blue-500">
        <span>{children}</span>
        <ArrowUpRight
          className="duration-250 transition-all group-hover:-translate-y-[2px] group-hover:translate-x-[2px]"
          size={14}
        />
      </a>
    )
  },
}
