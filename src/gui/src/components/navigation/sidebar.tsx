import { useEffect, useState, type MouseEvent } from 'react'
import {
  type LucideIcon,
  LayoutDashboard,
  ArrowRightFromLine,
  ArrowLeftFromLine,
  ChevronRight,
  Folder,
  FolderOpen,
  Library,
  Menu,
  X as IconX,
  PanelLeft,
} from 'lucide-react'
import { useAnimate, AnimatePresence, motion } from 'framer-motion'
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
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx'

interface SidebarLink {
  name: string
  href: string
  icon: LucideIcon
  target?: 'blank'
  external: boolean
}

const sidebarLinks: SidebarLink[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    external: false,
  },
  {
    name: 'Docs',
    href: 'https://docs.vlt.sh/cli/commands/query',
    icon: Library,
    target: 'blank',
    external: true,
  },
]

/**
 * Constants placed here for brevity
 */
const SIDEBAR_WIDTH = {
  open: '200px',
  closed: '61px',
}

const Sidebar = () => {
  return (
    <>
      <Sidebar.Desktop />
      <Sidebar.Mobile />
    </>
  )
}

Sidebar.Desktop = () => {
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)
  const updateStamp = useGraphStore(state => state.updateStamp)
  const savedProjects = useGraphStore(state => state.savedProjects)
  const updateSidebar = useGraphStore(
    state => state.updateLockSidebar,
  )
  const sidebarState = useGraphStore(state => state.lockSidebar)
  const animate = useGraphStore(state => state.lockSidebar)

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
      className={`relative hidden pl-[18px] md:flex flex-col justify-between sticky top-0 w-[${SIDEBAR_WIDTH.open}] h-screen border-r-[1px] flex-shrink-0`}
      animate={{
        width: !animate ? SIDEBAR_WIDTH.open : SIDEBAR_WIDTH.closed,
      }}>
      {/* sidebar-top */}
      <Sidebar.Logo className="pt-4" animate={animate} />

      <Sidebar.Divider
        animate={animate}
        className="mt-[56px] -ml-[18px]"
      />

      {/* sidebar-body */}
      <Sidebar.Body className="mt-8 w-[200px]">
        <div className="flex flex-col gap-4">
          {/* workspaces */}
          <div className="flex flex-col gap-4">
            <Sidebar.Subheader animate={animate} label="workspaces" />

            {sidebarLinks.map((link, idx) => (
              <Sidebar.Link
                link={link}
                key={idx}
                animate={animate}
                onClick={(e: MouseEvent) => {
                  if (!link.external) {
                    e.preventDefault()
                    updateActiveRoute(link.href)
                  }
                }}
              />
            ))}
          </div>

          {/* pinned projects */}
          <Sidebar.Category
            header="pinned"
            title="pinned projects"
            animate={animate}>
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
      </Sidebar.Body>

      <Sidebar.Divider
        animate={animate}
        className="bottom-[122px] -ml-[18px]"
      />

      {/* sidebar-bottom */}
      <div className="py-6 h-[122px]">
        <TooltipProvider skipDelayDuration={175} delayDuration={175}>
          <Tooltip>
            <TooltipTrigger>
              <button
                onClick={() => updateSidebar(!sidebarState)}
                className={`-ml-[4px] mt-[3px] flex items-center justify-center bg-transparent h-8 w-8 rounded-sm hover:text-foreground hover:bg-neutral-100 hover:dark:bg-neutral-800 transition-all ${!animate ? 'text-foreground' : 'text-neutral-600'}`}>
                <PanelLeft size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent align="start" side="right">
              <p>{sidebarState ? 'open' : 'close'} sidebar</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.div>
  )
}

Sidebar.Subheader = ({
  animate,
  label,
}: {
  animate: boolean
  label: string
}) => {
  return (
    <motion.p
      animate={{
        opacity: !animate ? 1 : 0,
        marginTop: !animate ? -3 : -20,
      }}
      className="text-xs capitalize font-semibold text-neutral-600 select-none tracking-wide">
      {label}
    </motion.p>
  )
}

Sidebar.Category = ({
  header,
  title,
  children,
  animate,
}: {
  header: string
  title: string
  children: React.ReactNode
  animate: boolean
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
      <Sidebar.Subheader label={header} animate={animate} />
      {/* category item */}
      <p
        className="flex flex-row justify-start items-center gap-2 group/sidebar-category-item cursor-pointer mt-4 mb-2 select-none"
        onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ?
          <FolderOpen size={20} />
        : <Folder size={20} />}

        <motion.span
          className="capitalize flex text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar-category-item:translate-x-1 transition duration-150"
          animate={{
            display: !animate ? 'inline-block' : 'none',
            opacity: !animate ? 1 : 0,
          }}>
          {title}
        </motion.span>

        <motion.span
          className="group-hover/sidebar-category-item:translate-x-1 transition duration-150"
          animate={{
            display: !animate ? 'inline-block' : 'none',
            opacity: !animate ? 1 : 0,
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
            animate={!animate ? 'show' : 'undefined'}
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
        className="flex items-center gap-2 text-neutral-700 hover:text-black dark:text-muted-foreground/50 dark:hover:text-foreground text-sm select-none cursor-pointer transition duration-150">
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
  setAnimate: (locked: boolean) => void
}) => {
  const [lockScope, lockAnimation] = useAnimate()

  const handleClick = () => {
    setAnimate(!animate)
    lockAnimation(lockScope.current, {
      rotateZ: [180, 0],
    })
  }

  return (
    <motion.div
      role="button"
      ref={lockScope}
      className="cursor-pointer"
      onClick={handleClick}>
      {animate ?
        <ArrowRightFromLine
          size={20}
          className="text-muted-foreground"
        />
      : <ArrowLeftFromLine size={20} />}
    </motion.div>
  )
}

Sidebar.Mobile = () => {
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)
  const updateStamp = useGraphStore(state => state.updateStamp)
  const savedProjects = useGraphStore(state => state.savedProjects)

  const [iconScope, animateIcon] = useAnimate()
  const [isOpen, setIsOpen] = useState<boolean>(false)

  const handleOpen = () => {
    if (isOpen) {
      animateIcon(iconScope.current, {
        rotateZ: [0, 180],
      })
      setIsOpen(false)
    } else {
      animateIcon(iconScope.current, {
        rotateZ: [180, 0],
      })
      setIsOpen(true)
    }
  }

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
    <div className="flex md:hidden justify-end absolute inset-0">
      {/* the switch */}
      <AnimatePresence>
        <motion.div
          ref={iconScope}
          className="absolute p-4 cursor-pointer h-fit z-[101]"
          onClick={handleOpen}
          exit={{
            opacity: 0,
          }}>
          {isOpen ?
            <IconX size={24} className="text-black dark:text-white" />
          : <Menu size={24} className="text-black dark:text-white" />}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        <motion.div
          className="flex flex-col h-screen inset-0 bg-white/80 dark:bg-black/50 backdrop-blur-md w-full z-[100] px-8 py-8 mt-[3.55rem]"
          initial={{
            opacity: 0,
          }}
          animate={{
            display: isOpen ? 'flex' : 'none',
            opacity: isOpen ? 1 : 0,
          }}
          exit={{
            opacity: 0,
          }}>
          {/* sidebar links */}
          <div className="flex flex-col w-full gap-4 divide-y-[1px] divide-muted-foreground/10">
            <h3 className="text-sm font-medium uppercase text-muted-foreground">
              workspaces
            </h3>
            {sidebarLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                onClick={(e: MouseEvent) => {
                  if (!link.external) {
                    e.preventDefault()
                    updateActiveRoute(link.href)
                  }
                }}
                className="font-medium text-lg pt-2">
                {link.name}
              </a>
            ))}
          </div>

          {/* sidebar projects */}
          {savedProjects && savedProjects.length > 0 && (
            <div className="flex flex-col w-full gap-4 divide-y-[1px] divide-muted-foreground/10 mt-12">
              <h3 className="text-sm font-medium uppercase text-muted-foreground">
                pinned projects
              </h3>
              {savedProjects.map((project, idx) => (
                <a
                  key={idx}
                  href="#"
                  onClick={(e: MouseEvent) => {
                    onProjectClick(e, project)
                  }}
                  className="font-medium text-lg pt-2">
                  {project.name}
                </a>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

Sidebar.Body = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <div className={`flex grow flex-col ${className}`}>
      {children}
    </div>
  )
}

Sidebar.Link = ({
  link,
  animate,
  onClick,
}: {
  link: SidebarLink
  animate: boolean
  onClick: (e: MouseEvent) => void
}) => {
  const activeRoute = useGraphStore(state => state.activeRoute)
  const [isOnRoute, setIsOnRoute] = useState<boolean>(false)

  useEffect(() => {
    if (location.pathname === '/' && link.href === '/dashboard') {
      setIsOnRoute(true)
    } else {
      setIsOnRoute(activeRoute === link.href)
    }
  }, [activeRoute])

  return (
    <>
      <motion.a
        href={link.href}
        onClick={onClick}
        target={link.target ? link.target : '_top'}
        className={`relative flex text-neutral-500 justify-start gap-2 group/sidebar-link rounded-md ${isOnRoute ? 'text-neutral-900 dark:text-neutral-100' : ''}`}>
        <TooltipProvider skipDelayDuration={175} delayDuration={175}>
          <Tooltip>
            <TooltipTrigger>
              {' '}
              <link.icon width={20} height={20} />
            </TooltipTrigger>
            <TooltipContent
              align="start"
              sideOffset={20}
              side="right">
              {link.name}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <motion.span
          className="text-sm"
          animate={{
            display: !animate ? 'inline-block' : 'none',
            opacity: !animate ? 1 : 0,
          }}>
          {link.name}
        </motion.span>
        {/* the hover effect background */}
        <motion.div
          animate={{
            width: !animate ? 175 : 0,
          }}
          className={`
            -mt-[7px] -ml-[5px] h-[34px] z-10 rounded-sm md:absolute
            ${
              isOnRoute ?
                'bg-muted-foreground/15'
              : 'hover:bg-muted-foreground/10 transition-all'
            }
          `}
        />
      </motion.a>
    </>
  )
}

Sidebar.Divider = ({
  animate,
  className = '',
}: {
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
        width: !animate ? SIDEBAR_WIDTH.open : SIDEBAR_WIDTH.closed,
      }}
    />
  )
}

Sidebar.Logo = ({
  animate,
  className = '',
}: {
  animate: boolean
  className?: string
}) => {
  return (
    <a
      className={`flex items-center justify-start gap-2 text-neutral-700 dark:text-neutral-200 text-xl font-medium ${className}`}
      href="/">
      vlt
      <motion.span
        className="font-light text-neutral-400 ml-0.5"
        animate={{
          display: !animate ? 'flex' : 'none',
          opacity: !animate ? 1 : 0,
        }}>
        /vōlt/
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
    updateStamp()
  } else {
    updateActiveRoute('/error')
    updateErrorCause('Failed to select project.')
  }
}

export { Sidebar }
