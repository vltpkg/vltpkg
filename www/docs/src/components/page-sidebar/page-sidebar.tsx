import { useState, useEffect } from 'react'
import { AlignLeft } from 'lucide-react'
import { type Props } from '@astrojs/starlight/props'
import { ScrollArea } from '@/components/ui/scroll-area'

const PageSidebar = ({ toc }: Props) => {
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
        let lastVisible: string | null = null

        entries.forEach(entry => {
          if (entry.isIntersecting) {
            lastVisible = entry.target.id
          }
        })
        setActiveAnchor(lastVisible)
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
      <div key={idx} className="flex flex-col gap-1">
        <Link href={item.slug} isActive={activeAnchor === item.slug}>
          {item.text}
        </Link>
        <div className="pl-4">{renderItems(item.children)}</div>
      </div>
    ))

  return (
    <div className="sticky top-0 hidden h-fit flex-col items-start pb-8 pt-8 md:flex md:w-[300px]">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <AlignLeft size={16} />
        On this page
      </h3>
      <ScrollArea className="max-h-[90svh] overflow-y-auto">
        <div className="-ml-2 flex flex-col gap-2 pr-4">
          {renderItems(anchors)}
        </div>
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
      className={`cursor-pointer pl-2 text-sm no-underline transition-all ${
        isActive ?
          'border-l-[2px] border-foreground text-foreground'
        : 'text-muted-foreground'
      } hover:text-foreground`}>
      {children}
    </a>
  )
}

export default PageSidebar
