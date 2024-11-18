import { useState, type MouseEvent } from 'react'
import { useTheme } from '@/components/ui/theme-provider.jsx'
import {
  LucideIcon,
  LayoutDashboard,
  ArrowRightFromLine,
  ArrowLeftFromLine,
  ChevronRight,
  Folder,
  FolderOpen,
  Library,
  Sun,
  Moon,
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

interface SidebarLink {
  name: string
  href: string
  icon: LucideIcon
  target?: 'blank'
  external: boolean
}

interface SidebarScreenProps {
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  animate: boolean
  setAnimate: (locked: boolean) => void
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
  const { lockSidebar: animate, updateLockSidebar: setAnimate } =
    useGraphStore()

  return (
    <>
      <Sidebar.Desktop
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        animate={animate as boolean}
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
        className="mt-[56px]"
      />
      <Sidebar.Body className="px-4">
        {/* top of the sidebar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <Sidebar.Logo
              className="mt-4 mb-6 h-[28px]"
              isOpen={isOpen}
              animate={animate}
            />

            <Sidebar.Subheader
              animate={animate}
              isOpen={isOpen}
              label="workspaces"
            />
            {sidebarLinks.map((link, idx) => (
              <Sidebar.Link
                link={link}
                key={idx}
                isOpen={isOpen}
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
        <div className="flex flex-col mb-[38px] gap-2">
          <Sidebar.Controls
            isOpen={isOpen}
            setAnimate={setAnimate}
            animate={animate}
          />
        </div>
      </Sidebar.Body>
      <Sidebar.Divider
        isOpen={isOpen}
        animate={animate}
        className="absolute bottom-0 mb-[95px]"
      />
    </motion.div>
  )
}

Sidebar.Subheader = ({
  animate,
  isOpen,
  label,
}: {
  animate: boolean
  isOpen: boolean
  label: string
}) => {
  return (
    <motion.p
      className="text-xs font-medium text-muted-foreground/50 uppercase select-none tracking-wide"
      animate={{
        opacity:
          animate ?
            isOpen ? 1
            : 0
          : 1,
      }}>
      {label}
    </motion.p>
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
      <Sidebar.Subheader
        label={header}
        animate={animate}
        isOpen={isOpen}
      />
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

  const handleClick = async () => {
    setAnimate(!animate)
    await lockAnimation(lockScope.current, {
      rotateZ: [180, 0],
    })
  }

  return (
    <motion.div
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
  onClick,
}: {
  link: SidebarLink
  isOpen: boolean
  animate: boolean
  onClick: (e: MouseEvent) => void
}) => {
  const { theme, activeRoute } = useGraphStore()

  const isOnRoute = activeRoute === link.href

  return (
    <>
      <motion.a
        href={link.href}
        onClick={onClick}
        target={link.target ? link.target : '_top'}
        animate={{
          color:
            isOnRoute ?
              theme === 'dark' ?
                '#fafafa'
              : '#3c3c3c'
            : '#757575',
        }}
        className={`
          relative flex justify-start gap-2 group/sidebar-link rounded-md
          `}>
        <link.icon width={20} height={20} />
        <motion.span
          className="text-sm"
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
        <motion.div
          animate={{
            width:
              animate ?
                isOpen ? 175
                : 0
              : 175,
          }}
          className={`
            absolute -mt-[7px] -ml-[5px] h-[34px] z-10 rounded-sm
            ${
              isOnRoute ?
                'bg-muted-foreground/25'
              : 'hover:bg-muted-foreground/10 transition-all'
            }
          `}
        />
      </motion.a>
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
      className={`flex items-center justify-start gap-2 text-neutral-700 dark:text-neutral-200 text-xl font-medium ${className}`}
      href="/">
      vlt
      <motion.span
        className="font-light text-neutral-400 ml-0.5"
        animate={{
          display:
            animate ?
              isOpen ? 'flex'
              : 'none'
            : 'flex',
          opacity:
            animate ?
              isOpen ? 1
              : 0
            : 1,
        }}>
        /vōlt/
      </motion.span>
    </a>
  )
}

Sidebar.ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme()
  const [themeScope, themeAnimation] = useAnimate()

  const handleThemeSwitch = async (mode: 'light' | 'dark') => {
    await themeAnimation(
      themeScope.current,
      {
        rotateZ: [0, 180, 360],
        y: [0, -5, 0],
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 10,
        },
      },
      { duration: 0.25 },
    )
    setTheme(mode)
  }

  return (
    <motion.div
      ref={themeScope}
      className="flex gap-3 items-center"
      onClick={() =>
        handleThemeSwitch(theme === 'light' ? 'dark' : 'light')
      }>
      {theme === 'light' ?
        <Moon className="cursor-pointer" size={20} />
      : <Sun className="cursor-pointer" size={20} />}
    </motion.div>
  )
}

Sidebar.Controls = ({
  isOpen,
  animate,
  setAnimate,
}: {
  isOpen: boolean
  animate: boolean
  setAnimate: (locked: boolean) => void
}) => {
  return (
    <AnimatePresence>
      <motion.div className="flex w-full justify-between items-center">
        {animate ?
          isOpen ?
            <>
              <Sidebar.ThemeSwitcher />
              <>
                <Sidebar.Lock
                  animate={animate}
                  setAnimate={setAnimate}
                />
              </>
            </>
          : <Sidebar.ThemeSwitcher />
        : <>
            <Sidebar.ThemeSwitcher />
            <>
              <Sidebar.Lock
                animate={animate}
                setAnimate={setAnimate}
              />
            </>
          </>
        }
      </motion.div>
    </AnimatePresence>
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
