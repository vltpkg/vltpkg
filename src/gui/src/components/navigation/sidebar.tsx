import { useState, type MouseEvent } from 'react'
import {
  Bird,
  LucideIcon,
  LayoutDashboard,
  Lock,
  LockOpen,
  ChevronRight,
  Folder,
  FolderOpen,
  Library,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { SidebarThemeSwitcher } from '@/components/ui/theme-switcher.jsx'
import { DEFAULT_QUERY, useGraphStore } from '@/state/index.js'
import {
  type DashboardDataProject,
  type Action,
} from '@/state/types.js'

type selectProjectItem = {
  updateActiveRoute: Action['updateActiveRoute']
  updateErrorCause: Action['updateErrorCause']
  updateQuery: Action['updateQuery']
  updateStamp: Action['updateStamp']
  item: DashboardDataProject
}

interface SidebarLink {
  name: string
  href: string
  icon: LucideIcon
  target?: 'blank'
}

interface SidebarScreenProps {
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  animate: boolean
  setAnimate: React.Dispatch<React.SetStateAction<boolean>>
}

const sidebarLinks: SidebarLink[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Docs',
    href: 'https://docs.vlt.sh/cli/commands/query',
    icon: Library,
    target: 'blank',
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
const Sidebar = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [animate, setAnimate] = useState<boolean>(true)

  return (
    <>
      <Sidebar.Desktop
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        animate={animate}
        setAnimate={setAnimate}
      />
      <Sidebar.Mobile />
    </>
  )
}

Sidebar.Desktop = ({
  isOpen,
  setIsOpen,
  animate,
  setAnimate,
}: SidebarScreenProps) => {
  const {
    updateActiveRoute,
    updateErrorCause,
    updateQuery,
    updateStamp,
    savedProjects,
  } = useGraphStore()

  const onProjectClick = (
    e: MouseEvent,
    item: DashboardDataProject,
  ) => {
    e.preventDefault()
    selectProjectItem({
      updateActiveRoute,
      updateErrorCause,
      updateQuery,
      updateStamp,
      item,
    }).catch((err: unknown) => console.error(err))
  }

  return (
    <motion.div
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      className={`relative hidden md:flex sticky top-0 w-[${SIDEBAR_WIDTH.open}] h-screen border-r-[1px] flex-shrink-0`}
      animate={{
        width:
          animate ?
            isOpen ? SIDEBAR_WIDTH.open
            : SIDEBAR_WIDTH.closed
          : SIDEBAR_WIDTH.open,
      }}>
      <Sidebar.Divider
        isOpen={isOpen}
        animate={animate}
        className="mt-[52px]"
      />
      <Sidebar.Body className="px-4">
        {/* top of the sidebar */}
        <div className="flex flex-col gap-4">
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

          {/* category - pinned projects */}
          <Sidebar.Category
            header="pinned"
            title="pinned projects"
            animate={animate}
            isOpen={isOpen}>
            {savedProjects?.map((project, idx) => (
              <Sidebar.Item
                key={idx}
                onClick={(e: MouseEvent) =>
                  onProjectClick(e, project)
                }
                label={project.name}
                icon={<Folder size={18} />}
              />
            ))}
          </Sidebar.Category>
        </div>

        {/* bottom of the sidebar */}
        <div className="flex flex-col mb-6 gap-2">
          <SidebarThemeSwitcher />
          <Sidebar.Lock animate={animate} setAnimate={setAnimate} />
        </div>
      </Sidebar.Body>
      <Sidebar.Divider
        isOpen={isOpen}
        animate={animate}
        className="mt-[758px]"
      />
    </motion.div>
  )
}

Sidebar.Category = ({
  header,
  title,
  children,
  animate,
  isOpen,
}: {
  header: string
  title: string
  children: React.ReactNode
  animate: boolean
  isOpen: boolean
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const contentVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
    exit: { opacity: 0, transition: { staggerChildren: 0.05 } },
  }

  return (
    <div className="flex flex-col mt-6">
      {/* category title */}
      <motion.p
        className="text-xs font-medium text-muted-foreground/50 uppercase select-none tracking-wide"
        animate={{
          opacity:
            animate ?
              isOpen ? 1
              : 0
            : 1,
        }}>
        {header}
      </motion.p>
      {/* category item */}
      <p
        className="flex flex-row justify-start items-center gap-2 group/sidebar-category-item cursor-pointer mt-4 mb-2 select-none"
        onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ?
          <FolderOpen size={20} />
        : <Folder size={20} />}

        <motion.span
          className="capitalize flex text-neutral-700 dark:text-neutral-200 text-sm font-medium group-hover/sidebar-category-item:translate-x-1 transition duration-150"
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
          {title}
        </motion.span>

        <motion.span
          className="group-hover/sidebar-category-item:translate-x-1 transition duration-150"
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
          <ChevronRight
            className="transition duration-150"
            size={16}
            style={{
              transform: isExpanded ? 'rotate(90deg)' : undefined,
            }}
          />
        </motion.span>
      </p>
      {/* category content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="flex flex-col gap-2"
            variants={contentVariants}
            initial="hidden"
            animate={
              animate ?
                isOpen ?
                  'show'
                : 'undefined'
              : 'show'
            }
            exit="exit">
            {/* individual projects */}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

Sidebar.Item = ({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  onClick?: (e: MouseEvent) => void
}) => {
  const itemVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
    exit: { opacity: 0 },
  }
  return (
    <motion.div variants={itemVariants}>
      <a
        href="#"
        onClick={onClick}
        className="flex items-center gap-2 text-neutral-700 hover:text-black dark:text-muted-foreground/50 dark:hover:text-foreground text-sm font-medium select-none cursor-pointer hover:translate-x-2 transition duration-150">
        {icon}
        <span>{label}</span>
      </a>
    </motion.div>
  )
}

Sidebar.Lock = ({
  animate,
  setAnimate,
}: {
  animate: boolean
  setAnimate: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  return (
    <div
      className="cursor-pointer"
      onClick={() => setAnimate(!animate)}>
      {animate ?
        <LockOpen size={20} />
      : <Lock size={20} />}
    </div>
  )
}

Sidebar.Mobile = () => {
  return <div></div>
}

Sidebar.Body = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <div
      className={`flex flex-col justify-between h-full fixed ${className}`}>
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
        target={link.target ? link.target : '_top'}
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

Sidebar.Divider = ({
  isOpen,
  animate,
  className = '',
}: {
  isOpen: boolean
  animate: boolean
  className?: string
}) => {
  return (
    <motion.div
      className={`fixed border-t-[1px] ${className}`}
      initial={{
        width: SIDEBAR_WIDTH.open,
      }}
      animate={{
        width:
          animate ?
            isOpen ? SIDEBAR_WIDTH.open
            : SIDEBAR_WIDTH.closed
          : SIDEBAR_WIDTH.open,
      }}
    />
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

const selectProjectItem = async ({
  updateActiveRoute,
  updateErrorCause,
  updateQuery,
  updateStamp,
  item,
}: selectProjectItem) => {
  let req
  try {
    req = await fetch('/select-project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: item.path,
      }),
    })
  } catch (err) {
    console.error(err)
    updateActiveRoute('/error')
    updateErrorCause('Failed to request project selection.')
    return
  }

  let projectSelected = false
  try {
    projectSelected = (await req.json()) === 'ok'
  } catch (err) {
    console.error(err)
  }

  if (projectSelected) {
    window.scrollTo(0, 0)
    updateQuery(DEFAULT_QUERY)
    updateActiveRoute('/explore')
    updateStamp(String(Math.random()).slice(2))
  } else {
    updateActiveRoute('/error')
    updateErrorCause('Failed to select project.')
  }
}

export { Sidebar }
