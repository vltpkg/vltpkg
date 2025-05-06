import { useState, useEffect } from 'react'
import { AlignLeft } from 'lucide-react'
import type { Props } from '@astrojs/starlight/props'
import { ScrollArea } from '@/components/ui/scroll-area.tsx'

export const PageSidebar = ({ toc }: Props) => {
  const [activeAnchor, setActiveAnchor] = useState<string | null>(
    null,
  )

  const anchors = toc?.items ?? []

  const flattenAnchors = (
    items: typeof anchors,
  ): { slug: string; text: string }[] => {
    return items.reduce<{ slug: string; text: string }[]>(
      (acc, item) => {
        acc.push({ slug: item.slug, text: item.text })
        acc.push(...flattenAnchors(item.children))
        return acc
      },
      [],
    )
  }

  const flattenedAnchors = flattenAnchors(anchors)

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(entry => {
          return entry.isIntersecting
        })
        const firstVisible = visible[0]?.target?.id || null
        setActiveAnchor(firstVisible)
      },
      {
        threshold: [0.25, 0.5, 0.75],
        rootMargin: '-100px 0px -50px 0px',
      },
    )

    flattenedAnchors.forEach(item => {
      const anchor = document.getElementById(item.slug)
      if (anchor) observer.observe(anchor)
    })

    return () => {
      flattenedAnchors.forEach(item => {
        const anchor = document.getElementById(item.slug)
        if (anchor) observer.unobserve(anchor)
      })
    }
  }, [flattenedAnchors])

  const renderItems = (items: typeof anchors) =>
    items.map((item, idx) => (
      <div
        key={idx}
        className="flex flex-col gap-1 pb-1 pr-8 8xl:pr-0">
        <Link href={item.slug} isActive={activeAnchor === item.slug}>
          {item.text}
        </Link>
        <div className="pl-4">{renderItems(item.children)}</div>
      </div>
    ))

  return (
    <div className="hidden h-fit flex-col items-start py-8 md:flex md:w-[200px]">
      <h3 className="mb-3 inline-flex items-center gap-2 text-sm text-foreground/80">
        <AlignLeft size={16} />
        On this page
      </h3>
      <ScrollArea className="max-h-[80svh] w-full overflow-y-auto">
        {renderItems(anchors)}
      </ScrollArea>
    </div>
  )
}

const Link = ({
  href,
  children,
  isActive,
}: {
  href: string
  children: React.ReactNode
  isActive: boolean
}) => {
  return (
    <a
      href={`#${href}`}
      className={`relative cursor-pointer text-sm no-underline transition-all hover:text-foreground ${
        isActive ? 'text-foreground' : 'text-muted-foreground'
      }`}>
      {children}
    </a>
  )
}
