'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
import type * as PageTree from 'fumadocs-core/page-tree'
import { cn } from 'cn'
import { SearchDialog, SearchTrigger } from '@/components/search'
import type { SuggestionGroup } from '@/components/search'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Github } from '@/components/icons/github'
import { Linkedin } from '@/components/icons/linkedin'
import { TwitterX } from '@/components/icons/twitterx'
import { Bluesky } from '@/components/icons/bluesky'
import { Discord } from '@/components/icons/discord'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar'

type Folder = PageTree.Folder
type Dir = 'forward' | 'back'
type Go = (stack: Folder[], dir: Dir) => void

const row =
  'h-9 rounded-lg px-3 text-sm text-sidebar-foreground/80 hover:text-sidebar-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-foreground'

const isVisible = (node: PageTree.Node) =>
  !(node.type === 'folder' && node.name === '_media')

const containsUrl = (folder: Folder, url: string): boolean =>
  folder.index?.url === url ||
  folder.children.some(child =>
    child.type === 'folder' ?
      containsUrl(child, url)
    : child.type === 'page' && child.url === url,
  )

const findFolder = (
  nodes: PageTree.Node[],
  match: (folder: Folder) => boolean,
) =>
  nodes.find(
    (node): node is Folder => node.type === 'folder' && match(node),
  )

// Drill-in rule: a view shows its folder's children, with child folders as inline sections;
// folders inside those sections drill in again. So each view spans two levels of the tree.
const stackFor = (nodes: PageTree.Node[], url: string): Folder[] => {
  const folder = findFolder(nodes, f => containsUrl(f, url))
  if (!folder) return []
  const section = findFolder(folder.children, f =>
    containsUrl(f, url),
  )
  return [folder, ...(section ? stackFor(section.children, url) : [])]
}

// tree names are ReactNodes, but in practice the strings from frontmatter and meta.json
const text = (name: React.ReactNode) =>
  typeof name === 'string' || typeof name === 'number' ?
    String(name)
  : ''

const keyOf = (stack: Folder[]) =>
  stack.at(-1)?.$id ?? text(stack.at(-1)?.name ?? 'root')

// root-level `---Label---` separators from meta.json start a new labelled group
const toGroups = (nodes: PageTree.Node[]) =>
  nodes.reduce<
    { name?: React.ReactNode; children: PageTree.Node[] }[]
  >(
    (groups, node) => {
      if (node.type === 'separator')
        groups.push({ name: node.name, children: [] })
      else groups[groups.length - 1].children.push(node)
      return groups
    },
    [{ children: [] }],
  )

// the top level of the sidebar, as search's empty-query list: loose pages, and folders via their index page
const toSuggestions = (tree: PageTree.Root): SuggestionGroup[] =>
  toGroups(tree.children.filter(isVisible)).map(group => ({
    name: group.name,
    links: group.children.flatMap(node =>
      node.type === 'page' ? [{ name: node.name, url: node.url }]
      : node.type === 'folder' && node.index ?
        [{ name: node.name, url: node.index.url, folder: true }]
      : [],
    ),
  }))

const PageLink = ({
  page,
  sub,
}: {
  page: PageTree.Item
  sub?: boolean
}) => {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className={cn(row, sub && 'text-muted-foreground pl-6')}>
        <Link
          href={page.url}
          aria-current={page.url === pathname ? 'page' : undefined}
          onClick={() => setOpenMobile(false)}>
          <span>{page.name}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

type EntryProps = {
  node: PageTree.Node
  stack: Folder[]
  go: Go
  returnTo?: Folder
  sub?: boolean
}

const Entry = ({ node, stack, go, returnTo, sub }: EntryProps) => {
  if (node.type === 'page') return <PageLink page={node} sub={sub} />
  if (node.type === 'separator')
    return (
      <SidebarGroupLabel className="mt-3 px-3">
        {node.name}
      </SidebarGroupLabel>
    )
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={cn(row, sub && 'text-muted-foreground pl-6')}
        autoFocus={node === returnTo}
        onClick={() => go([...stack, node], 'forward')}>
        <span>{node.name}</span>
        <ChevronRightIcon className="ml-auto opacity-60" />
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

const Section = ({
  folder,
  ...props
}: Omit<EntryProps, 'node' | 'sub'> & { folder: Folder }) => {
  const pathname = usePathname()
  const open =
    containsUrl(folder, pathname) ||
    (!!props.returnTo && folder.children.includes(props.returnTo))
  return (
    <Collapsible asChild defaultOpen={open}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className={cn(
              row,
              'text-sidebar-foreground group/section font-semibold',
            )}>
            <span>{folder.name}</span>
            <ChevronDownIcon className="ml-auto opacity-60 transition-transform duration-200 ease-out group-data-[state=closed]/section:-rotate-90 motion-reduce:transition-none" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenu>
            {folder.index && (
              <PageLink
                page={{ ...folder.index, name: 'Overview' }}
                sub
              />
            )}
            {folder.children.filter(isVisible).map(child => (
              <Entry
                key={child.$id ?? text(child.name)}
                node={child}
                {...props}
                sub
              />
            ))}
          </SidebarMenu>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

type ViewProps = React.ComponentProps<'div'> & {
  tree: PageTree.Root
  stack: Folder[]
  go: Go
  focusBack?: boolean
  returnTo?: Folder
}

const View = ({
  tree,
  stack,
  go,
  focusBack,
  returnTo,
  className,
  ...props
}: ViewProps) => {
  const folder = stack.at(-1)
  const entry = { stack, go, returnTo }

  return (
    <div
      className={cn(
        'col-start-1 row-start-1 min-w-0 px-2 pb-4',
        className,
      )}
      {...props}>
      {!folder ?
        toGroups(tree.children.filter(isVisible)).map((group, i) => (
          <SidebarGroup key={i} className="px-0">
            {group.name && (
              <SidebarGroupLabel className="px-3">
                {group.name}
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.children.map(node => (
                <Entry
                  key={node.$id ?? text(node.name)}
                  node={node}
                  {...entry}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))
      : <SidebarGroup className="px-0">
          <button
            type="button"
            className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-sidebar-ring mb-1 grid h-10 w-full grid-cols-[2.25rem_1fr_2.25rem] items-center rounded-lg outline-hidden focus-visible:ring-2 [&_svg]:size-4"
            aria-label={`${text(folder.name)}, back to ${text(stack.at(-2)?.name ?? 'main menu')}`}
            autoFocus={focusBack}
            onClick={() => go(stack.slice(0, -1), 'back')}>
            <ChevronLeftIcon
              aria-hidden
              className="justify-self-center"
            />
            <span className="text-sidebar-foreground truncate text-center text-sm font-medium">
              {folder.name}
            </span>
          </button>
          <SidebarMenu>
            {folder.index && (
              <PageLink
                page={{ ...folder.index, name: 'Overview' }}
              />
            )}
            {folder.children
              .filter(isVisible)
              .map(node =>
                node.type === 'folder' ?
                  <Section
                    key={node.$id ?? text(node.name)}
                    folder={node}
                    {...entry}
                  />
                : <Entry
                    key={node.$id ?? text(node.name)}
                    node={node}
                    {...entry}
                  />,
              )}
          </SidebarMenu>
        </SidebarGroup>
      }
    </div>
  )
}

// from vlt.io's content/marketing/socials.ts; GitHub points at this repo rather than the org
const socials = [
  {
    href: 'https://github.com/vltpkg/vltpkg',
    label: 'vltpkg on GitHub',
    Icon: Github,
  },
  {
    href: 'https://www.linkedin.com/company/vltpkg/',
    label: 'vlt on LinkedIn',
    Icon: Linkedin,
  },
  { href: 'https://x.com/vltpkg', label: 'vlt on X', Icon: TwitterX },
  {
    href: 'https://bsky.app/profile/vlt.sh',
    label: 'vlt on Bluesky',
    Icon: Bluesky,
  },
  {
    href: 'https://discord.gg/qdbXTqxZzZ',
    label: 'vlt on Discord',
    Icon: Discord,
  },
]

// a folder's index, else its first page (depth-first)
const firstUrl = (folder?: Folder): string | undefined => {
  if (!folder) return
  if (folder.index) return folder.index.url
  for (const child of folder.children.filter(isVisible)) {
    const url =
      child.type === 'page' ? child.url
      : child.type === 'folder' ? firstUrl(child)
      : undefined
    if (url) return url
  }
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  tree: PageTree.Root
}

export function AppSidebar({ tree, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const scroller = useRef<HTMLDivElement>(null)
  // each view's scroll offset when drilled out of, restored on the way back
  const scrolls = useRef(new Map<string, number>())
  const searchTrigger = useRef<HTMLButtonElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [stack, setStack] = useState(() =>
    stackFor(tree.children, pathname),
  )
  const [prev, setPrev] = useState<{
    stack: Folder[]
    dir: Dir
  } | null>(null)
  const [lastPathname, setLastPathname] = useState(pathname)

  // follow navigation from outside the sidebar once it leaves the open view
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    const folder = stack.at(-1)
    if (folder && !containsUrl(folder, pathname)) {
      setStack(stackFor(tree.children, pathname))
      setPrev(null)
    }
  }

  const go: Go = (next, dir) => {
    setPrev({ stack, dir })
    setStack(next)
    // restoring before the returning view mounts means its autofocused row is already in view,
    // so focus doesn't scroll (and overshoot while the taller outgoing view still sets the height)
    if (dir === 'forward')
      scrolls.current.set(
        keyOf(stack),
        scroller.current?.scrollTop ?? 0,
      )
    scroller.current?.scrollTo({
      top:
        dir === 'back' ? (scrolls.current.get(keyOf(next)) ?? 0) : 0,
    })
    // drilling in also opens the folder's first page, so it's one click not two
    const url = dir === 'forward' ? firstUrl(next.at(-1)) : undefined
    if (url && url !== pathname) router.push(url)
  }

  // the dialog sits outside <Sidebar> so ⌘K still works while the mobile sheet is closed
  return (
    <>
      <Sidebar className="border-none" {...props}>
        <SidebarHeader className="px-2 pt-4 pb-0">
          <SearchTrigger
            ref={searchTrigger}
            onClick={() => setSearchOpen(true)}
          />
        </SidebarHeader>
        {/* browsers without scroll-driven animations get no fade rather than a static one over the first rows */}
        <SidebarContent
          ref={scroller}
          className="scroll-fade overflow-x-hidden pt-2 [--scroll-fade-size:--spacing(8)] not-supports-[animation-timeline:scroll()]:[--scroll-fade-size:0px]">
          <div className="grid">
            {prev && (
              <View
                key={keyOf(prev.stack)}
                tree={tree}
                stack={prev.stack}
                go={go}
                inert
                aria-hidden
                className={`view-out-${prev.dir}`}
                onAnimationEnd={e =>
                  e.target === e.currentTarget && setPrev(null)
                }
              />
            )}
            <View
              key={keyOf(stack)}
              tree={tree}
              stack={stack}
              go={go}
              focusBack={prev?.dir === 'forward'}
              returnTo={
                prev?.dir === 'back' ? prev.stack.at(-1) : undefined
              }
              className={prev ? `view-in-${prev.dir}` : undefined}
            />
          </div>
        </SidebarContent>
        <SidebarFooter className="px-4">
          <div className="bg-card flex items-center rounded-xl border p-1">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/50 grid size-8 place-items-center rounded-md transition-colors outline-none focus-visible:ring-2">
                <Icon aria-hidden className="size-4" />
              </a>
            ))}
            <div
              aria-hidden
              className="bg-border mr-1 ml-auto h-5 w-px"
            />
            <ThemeSwitcher />
          </div>
        </SidebarFooter>
      </Sidebar>
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        returnFocus={searchTrigger}
        suggestions={toSuggestions(tree)}
      />
    </>
  )
}
