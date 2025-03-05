import { Card } from '@/components/ui/card.tsx'
import { ArrowUpRight } from 'lucide-react'
import type React from 'react'

export const CardGrid = ({
  children,
}: {
  children: React.ReactNode
}) => {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {children}
    </section>
  )
}

interface CardGridLinkProps {
  href?: string
  title: string
  description: string
  img: string
}

export const CardGridLink = ({
  href,
  title,
  description,
  img,
}: CardGridLinkProps) => {
  return (
    <a
      href={href ?? undefined}
      className="h-42 group rounded-md no-underline">
      <Card className="duration-250 relative flex h-full flex-col items-start justify-center gap-2 space-y-0 overflow-hidden rounded-md px-5 py-3 transition-all group-hover:border-muted-foreground/50">
        <ArrowUpRight
          className="duration-250 absolute right-3 top-3 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
          size={16}
        />
        <img
          className="size-8 text-muted-foreground dark:invert dark:filter"
          src={img}
        />
        <div className="flex h-full w-full grow flex-col gap-0.5">
          <h3
            data-card="header"
            className="data-[card=header]:text-lg data-[card=header]:text-foreground">
            {title}
          </h3>
          <p
            data-card="description"
            className="data-[card=description]:m-0 data-[card=description]:text-sm">
            {description}
          </p>
        </div>
      </Card>
    </a>
  )
}
