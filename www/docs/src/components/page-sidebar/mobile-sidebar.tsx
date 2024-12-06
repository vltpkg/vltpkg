import { useEffect, useState } from 'react'
import { type Props } from '@astrojs/starlight/props'
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'

const MobileSidebar = ({ toc }: Props) => {
  const [activeAnchor, setActiveAnchor] = useState<string | null>(
    null,
  )
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)

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
        threshold: 0.5,
        rootMargin: '-50px 0px -50px 0px',
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
      <div key={idx} className="flex flex-col">
        <MobileSidebar.Link
          isActive={activeAnchor === item.slug}
          href={item.slug}
          setDrawerOpen={setDrawerOpen}>
          {item.text}
        </MobileSidebar.Link>
        <div className="pl-4">{renderItems(item.children)}</div>
      </div>
    ))

  return (
    <div className="px-6 py-3 w-full border-y-[1px] backdrop-blur-md">
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <div className="bg-transparent flex flex-row items-center gap-6">
          <Button
            variant="outline"
            onClick={() => setDrawerOpen(true)}>
            On this page <ChevronRight size={16} />
          </Button>
          <p className="text-md text-muted-foreground">
            {activeAnchor}
          </p>
        </div>
        <DrawerContent>
          <div className="flex flex-col px-6 py-8">
            <DrawerTitle className="mb-6">On this page</DrawerTitle>
            <DrawerDescription></DrawerDescription>
            {renderItems(anchors)}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

MobileSidebar.Link = ({
  href,
  children,
  setDrawerOpen,
  isActive,
}: {
  href: string
  children: React.ReactNode
  isActive: boolean
  setDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  const scrollTo = ({ slug }: { slug: string }) => {
    setDrawerOpen(false)
    if (slug === '_top') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    } else {
      const el = document.getElementById(slug)
      if (el) {
        const elPos = el.offsetTop
        window.scrollTo({
          top: elPos - 50,
          behavior: 'smooth',
        })
      }
    }
  }

  return (
    <p
      onClick={() => scrollTo({ slug: href })}
      className={`border-t-[1px] py-3 no-underline text-md cursor-pointer transition-all ${
        isActive ?
          'font-bold text-foreground'
        : 'text-muted-foreground'
      }`}>
      {children}
    </p>
  )
}

export default MobileSidebar
