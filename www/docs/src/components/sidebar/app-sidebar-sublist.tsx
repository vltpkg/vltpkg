import React, { useRef, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronUp } from 'lucide-react'
import {
  type SidebarEntries,
  type Link,
  type Group,
} from './app-sidebar'

const AppSidebarSublist = ({
  sidebar,
  className = '',
}: {
  sidebar: SidebarEntries
  className?: string
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedScrollPosition = localStorage.getItem(
      'sidebar-scroll-position',
    )
    if (savedScrollPosition && sidebarRef.current) {
      requestAnimationFrame(() => {
        if (sidebarRef.current) {
          sidebarRef.current.scrollTop = parseInt(
            savedScrollPosition,
            10,
          )
        }
      })
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (sidebarRef.current) {
        localStorage.setItem(
          'sidebar-scroll-position',
          sidebarRef.current.scrollTop.toString(),
        )
      }
    }

    const ref = sidebarRef.current
    ref?.addEventListener('scroll', handleScroll)

    return () => {
      ref?.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div
      ref={sidebarRef}
      className={`flex flex-col mt-8 gap-2 h-full overflow-y-auto ${className}`}>
      {sidebar.map((entry, idx) => (
        <React.Fragment key={idx}>
          {entry.type === 'group' ?
            <Group entry={entry} />
          : <Item entry={entry} />}
        </React.Fragment>
      ))}
    </div>
  )
}

interface SublistProps {
  className?: string
  entry: Group
}

interface SidebarState {
  [key: string]: boolean
}

const Group = ({ className = '', entry }: SublistProps) => {
  const storedState: SidebarState = JSON.parse(
    localStorage.getItem('sidebar-state') || '{}',
  ) as SidebarState
  const initialExpanded = storedState[entry.label] ?? !entry.collapsed
  const [expanded, setExpanded] = useState<boolean>(initialExpanded)

  /**
   * Ensures that the collapsed items are persistent
   * across page refreshes and reloads.
   *
   * Pulls the intial state of the collapsed group
   * from astro, and sets in local storage on
   * consecutive requests.
   */
  useEffect(() => {
    const storedState = JSON.parse(
      localStorage.getItem('sidebar-state') || '{}',
    ) as SidebarState
    storedState[entry.label] = expanded
    localStorage.setItem('sidebar-state', JSON.stringify(storedState))
  }, [expanded, entry.label])

  return (
    <div className={`flex flex-col ${className}`}>
      <div
        className="flex flex-row justify-between cursor-pointer group"
        onClick={() => setExpanded(!expanded)}>
        <p className="text-sm text-muted-foreground group-hover:text-foreground transition-all">
          {entry.label}
        </p>
        <motion.div
          className="flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-all"
          style={{
            rotateZ: expanded ? 180 : 0,
          }}>
          <ChevronUp size={16} />
        </motion.div>
      </div>

      {/* groups */}
      <motion.div
        className="flex flex-col pl-4 border-l-[1px] gap-2 mt-2"
        style={{
          display: expanded ? 'flex' : 'none',
        }}>
        {entry.entries.map((entry, idx) => (
          <React.Fragment key={idx}>
            {entry.type === 'group' ?
              <Group entry={entry} />
            : <Item entry={entry} />}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  )
}

const Item = ({
  className = '',
  entry,
}: {
  className?: string
  entry: Link
}) => {
  return (
    <div className={`relative flex h-fit ${className}`}>
      <div
        className={`absolute h-full w-[1px] left-0 -ml-[17px] ${
          entry.isCurrent ? 'bg-foreground' : 'hidden'
        }`}
      />
      <a
        href={entry.href}
        role="link"
        className={`cursor-pointer text-sm no-underline text-sm font-medium hover:text-foreground transition-all ${
          entry.isCurrent ? 'text-foreground' : (
            'text-muted-foreground'
          )
        }`}>
        {entry.label}
      </a>
    </div>
  )
}

export default AppSidebarSublist
