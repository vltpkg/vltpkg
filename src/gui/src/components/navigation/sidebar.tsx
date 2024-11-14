import { useState } from 'react'
import { Bird, LucideIcon, LayoutDashboard } from 'lucide-react'
import { motion } from 'framer-motion'

interface SidebarLink {
  name: string
  href: string
  icon: LucideIcon
}

interface SidebarProps {
  animate?: boolean
}

interface SidebarScreenProps {
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  animate: boolean
}

const sidebarLinks: SidebarLink[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
]

/**
 * Constants placed here for brevity
 * */
const SIDEBAR_WIDTH = {
  open: '200px',
  closed: '60px',
}

/**
 * The `animate` prop controls whether the sidebar should either:
 * be in an open state, or be in a closed state, without triggering
 * animations.
 *
 * Two different sidebars are rendered on < `sm` and > `md` breakpoints.
 * */
const Sidebar = ({ animate = true }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false)

  return (
    <>
      <Sidebar.Desktop
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        animate={animate}
      />
      <Sidebar.Mobile
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        animate={animate}
      />
    </>
  )
}

Sidebar.Desktop = ({
  isOpen,
  setIsOpen,
  animate,
}: SidebarScreenProps) => {
  return (
    <motion.div
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      className={`hidden md:flex sticky top-0 w-[${SIDEBAR_WIDTH.open}] h-screen border-r-[1px] px-4 flex-shrink-0`}
      animate={{
        width:
          animate ?
            isOpen ? SIDEBAR_WIDTH.open
            : SIDEBAR_WIDTH.closed
          : SIDEBAR_WIDTH.open,
      }}>
      <Sidebar.Body>
        {/* top of the sidebar */}
        <div className="flex flex-col gap-4">
          <Sidebar.Logo
            className="mt-4 mb-4"
            isOpen={isOpen}
            animate={animate}
          />
          {sidebarLinks.map((link, idx) => (
            <Sidebar.Link
              link={link}
              key={idx}
              isOpen={isOpen}
              animate={animate}
            />
          ))}
        </div>

        {/* bottom of the sidebar */}
        <div className="flex flex-col mb-6">test</div>
      </Sidebar.Body>
    </motion.div>
  )
}

Sidebar.Mobile = ({
  isOpen,
  setIsOpen,
  animate,
}: SidebarScreenProps) => {
  return <div></div>
}

Sidebar.Body = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col justify-between h-full fixed">
      {children}
    </div>
  )
}

Sidebar.Link = ({
  link,
  isOpen,
  animate,
}: {
  link: SidebarLink
  isOpen: boolean
  animate: boolean
}) => {
  return (
    <>
      <a
        href={link.href}
        className="flex justify-start gap-2 group/sidebar-link">
        <link.icon width={20} height={20} />
        <motion.span
          className="text-neutral-700 dark:text-neutral-200 text-sm font-medium group-hover/sidebar-link:translate-x-1 transition duration-150"
          animate={{
            display:
              animate ?
                isOpen ? 'inline-block'
                : 'none'
              : 'inline-block',
            opacity:
              animate ?
                isOpen ? 1
                : 0
              : 1,
          }}>
          {link.name}
        </motion.span>
      </a>
    </>
  )
}

Sidebar.Logo = ({
  isOpen,
  animate,
  className = '',
}: {
  isOpen: boolean
  animate: boolean
  className?: string
}) => {
  return (
    <a
      className={`flex justify-start gap-2 group/sidebar-logo ${className}`}
      href="/">
      <Bird width={20} height={20} />
      <motion.span
        className="text-neutral-700 dark:text-neutral-200 text-sm font-medium group-hover/sidebar-logo:translate-x-1 transition duration-150"
        animate={{
          display:
            animate ?
              isOpen ? 'inline-block'
              : 'none'
            : 'inline-block',
          opacity:
            animate ?
              isOpen ? 1
              : 0
            : 1,
        }}>
        vlt <span className="font-light">/vōlt/</span>
      </motion.span>
    </a>
  )
}

export { Sidebar }
