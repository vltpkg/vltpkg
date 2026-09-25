import { Heading } from '@/components/heading'
import { cn } from 'cn'
import { Children, isValidElement } from 'react'
import { ArrowRightIcon, WorkflowIcon } from 'lucide-react'
import { Book as BookCover } from '@/components/book'
import { Vlt } from '@/components/icons/vlt'
import { Npm } from '@/components/icons/npm'
import { Pnpm } from '@/components/icons/pnpm'
import { Yarn } from '@/components/icons/yarn'
import { Bun } from '@/components/icons/bun'
import { Deno } from '@/components/icons/deno'
import type { MDXComponents } from 'mdx/types'
import { CodeBlock, CodeTabs } from '@/components/code-block'
import type { CodeSource } from '@/components/code-block'
import { InlineCode } from '@/components/inline-code'
import { TypeTable } from '@/components/type-table'
import { SyncedTabs } from '@/components/synced-tabs'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  AdaptiveImage,
  AdaptiveVideo,
} from '@/components/adaptive-media'
import {
  Step,
  StepContent,
  StepCount,
  Stepper,
  StepperList,
} from '@/components/ui/stepper'

type Children = { children?: React.ReactNode }
type TabItemProps = Children & { label: string }
// a fence arrives as <pre><code className="language-x" title?>text</code></pre> (see rehypeCodeMeta in lib/source.ts)
type FenceProps = {
  children?: string
  className?: string
  title?: string
}

const isVideo = (src: string) => /\.(mp4|webm|mov|ogv)$/i.test(src)
// the lightbox styles its own media; keep typeset's img rules off it
const mediaClassName = 'not-typeset'
// typeset's flow margin, for our blocks that its element rules don't reach
const flow = 'not-first:mt-(--typeset-flow)'

// markdown images arrive as imported image objects (fumadocs' remark-image), jsx ones as plain strings
const Media = ({ src, alt }: { src?: unknown; alt?: string }) => {
  const url =
    typeof src === 'string' ? src : (
      (src as { src?: unknown } | undefined)?.src
    )
  if (!url || typeof url !== 'string') return null
  return isVideo(url) ?
      <AdaptiveVideo src={url} alt={alt} className={mediaClassName} />
    : <AdaptiveImage src={url} alt={alt} className={mediaClassName} />
}

const fence = (children: React.ReactNode): CodeSource => {
  const {
    children: code = '',
    className,
    title,
  }: FenceProps =
    isValidElement(children) ? (children.props as FenceProps) : {}
  return { code, lang: className?.replace('language-', ''), title }
}

const Pre = ({ children }: Children) => {
  const { code, ...source } = fence(children)
  return (
    <CodeBlock {...source} className="w-full">
      {code}
    </CodeBlock>
  )
}

const Code = ({ code, ...source }: CodeSource) => (
  <CodeBlock {...source}>{code}</CodeBlock>
)

// a TabItem's content when it's one code block and nothing else
const onlyCode = (
  children: React.ReactNode,
): CodeSource | undefined => {
  const [only, ...rest] = Children.toArray(children)
  if (rest.length || !isValidElement(only)) return
  if (only.type === Code) return only.props as CodeSource
  if (only.type === Pre)
    return fence((only.props as Children).children)
}

// <Book icon="npm"> covers: the logo, over a pale tint of its brand colour so the logo still reads on it
const bookCovers = {
  vlt: { Icon: Vlt, color: 'oklch(0.9 0 0)' },
  npm: {
    Icon: Npm,
    color: 'color-mix(in oklch, #c12127 22%, white)',
  },
  pnpm: {
    Icon: Pnpm,
    color: 'color-mix(in oklch, #f8ab00 30%, white)',
  },
  yarn: {
    Icon: Yarn,
    color: 'color-mix(in oklch, #2c8ebb 25%, white)',
  },
  bun: {
    Icon: Bun,
    color: 'color-mix(in oklch, #ccbea7 45%, white)',
  },
  deno: { Icon: Deno, color: 'oklch(0.88 0.01 250)' },
  ci: { Icon: WorkflowIcon, color: 'oklch(0.9 0.05 155)' },
}

// package-manager tabs get their logo; any other label renders bare
const TabIcon = ({ label }: { label: string }) => {
  const key = label.toLowerCase()
  if (!(key in bookCovers)) return null
  const { Icon } = bookCovers[key as keyof typeof bookCovers]
  return <Icon aria-hidden />
}

// minimal stand-ins for the Starlight components used by the content copied from www/docs
export const components: MDXComponents = {
  pre: Pre,
  h2: ({ ref: _ref, ...props }) => <Heading as="h2" {...props} />,
  h3: ({ ref: _ref, ...props }) => <Heading as="h3" {...props} />,
  h4: ({ ref: _ref, ...props }) => <Heading as="h4" {...props} />,
  code: ({ ref: _ref, ...props }) => <InlineCode {...props} />,
  img: ({ src, alt }) => <Media src={src} alt={alt} />,
  // markdown wraps a lone image in <p>; the media renders block elements, so drop that wrapper
  p: ({ ref: _ref, children, ...props }) => {
    const [only, ...rest] = Children.toArray(children)
    const isMedia =
      !rest.length &&
      isValidElement<{ src?: unknown }>(only) &&
      only.props.src !== undefined
    return isMedia ? <>{children}</> : <p {...props}>{children}</p>
  },
  table: ({ ref: _ref, ...props }) => <TypeTable {...props} />,
  thead: TableHeader,
  tbody: TableBody,
  tr: TableRow,
  th: ({ ref: _ref, className, ...props }) => (
    <TableHead className={cn('px-3', className)} {...props} />
  ),
  // docs cells hold sentences, so they wrap (ui/table assumes one-line data) and rows top-align;
  // inline code (flags, names) reads worse broken at its hyphens than scrolled, and a squeezed wide
  // table would crush its last (description) column to a word per line
  td: ({ ref: _ref, className, ...props }) => (
    <TableCell
      className={cn(
        'px-3 py-2.5 align-top whitespace-normal last:min-w-40 [&_code]:whitespace-nowrap',
        className,
      )}
      {...props}
    />
  ),
  Code,
  Aside: ({
    type = 'note',
    title,
    children,
  }: Children & { type?: string; title?: string }) => (
    <aside
      data-type={type}
      className={`${flow} rounded-(--radius) border border-[color-mix(in_oklch,var(--tone)_30%,transparent)] bg-[color-mix(in_oklch,var(--tone)_7%,transparent)] px-4 py-3.5 [--tone:var(--note)] data-[type=caution]:[--tone:var(--caution)] data-[type=danger]:[--tone:var(--danger)] data-[type=tip]:[--tone:var(--tip)] [&>:is(p,ul,ol,figure):first-of-type]:mt-1 [&>:last-child]:mb-0`}>
      <strong className="block text-(--tone) capitalize">
        {title ?? type}
      </strong>
      {children}
    </aside>
  ),
  Badge: ({ text }: { text: string }) => (
    <span className="rounded-full bg-[color-mix(in_oklch,var(--note)_15%,transparent)] px-2 py-0.5 align-middle text-[0.75rem] font-medium text-(--note)">
      {text}
    </span>
  ),
  LinkCard: ({
    title,
    description,
    href,
  }: {
    title: string
    description?: string
    href: string
  }) => (
    <a
      href={href}
      className="hover:bg-card flex flex-col gap-1 rounded-(--radius) border p-5 no-underline transition-[background-color] duration-150 ease-out">
      <strong className="flex items-center justify-between gap-2">
        {title}
        <ArrowRightIcon
          aria-hidden
          className="text-muted-foreground size-4"
        />
      </strong>
      {description && (
        <span className="text-muted-foreground text-sm leading-[1.6] font-normal">
          {description}
        </span>
      )}
    </a>
  ),
  // a shelf of <Book>s: two to a row, three once the article is wide enough (a container query, since the
  // sidebar decides the article's width, not the viewport)
  Bookshelf: ({ children }: Children) => (
    <div data-not-typeset className={`${flow} @container`}>
      <div className="grid grid-cols-2 justify-items-start gap-x-5 gap-y-8 @lg:grid-cols-3">
        {children}
      </div>
    </div>
  ),
  Book: ({
    icon,
    ...props
  }: {
    title: string
    href: string
    description?: string
    icon?: keyof typeof bookCovers
  }) => {
    const cover = icon && bookCovers[icon]
    return (
      <BookCover
        {...props}
        width={150}
        // brand logos need more room than a glyph to read as themselves (~24px at this width)
        className="[--book-icon-size:31]"
        color={cover ? cover.color : undefined}
        icon={cover ? <cover.Icon /> : undefined}
      />
    )
  },
  CardGrid: ({ children }: Children) => (
    // repeat(2, 1fr), not grid-cols-2's minmax(0, 1fr): a long unbroken word widens its column
    <div
      className={`${flow} grid gap-4 sm:grid-cols-[repeat(2,1fr)]`}>
      {children}
    </div>
  ),
  // Starlight's <Steps> wraps a markdown ordered list; each item becomes a vlt.io stepper step
  Steps: ({ children }: Children) => {
    const list = Children.toArray(children).find(
      isValidElement<Children>,
    )
    const items = Children.toArray(list?.props.children).filter(
      isValidElement<Children>,
    )
    return (
      <Stepper className={flow}>
        <StepperList className="pl-0">
          {items.map((item, i) => (
            <Step key={i}>
              <StepCount>{i + 1}</StepCount>
              <StepContent className="min-w-0 [&>:first-child]:mt-0">
                {item.props.children}
              </StepContent>
            </Step>
          ))}
        </StepperList>
      </Stepper>
    )
  },
  // MDX hands server components unrendered children, so TabItem labels are readable here
  Tabs: ({ children }: Children) => {
    const items = Children.toArray(children).filter(
      isValidElement<TabItemProps>,
    )
    // tabs of nothing but code become one code card, its tabs named after the TabItems
    const code = items.flatMap(item => {
      const source = onlyCode(item.props.children)
      return source ? [{ ...source, title: item.props.label }] : []
    })
    if (code.length && code.length === items.length)
      return <CodeTabs tabs={code} />
    return (
      <SyncedTabs
        labels={items.map(item => item.props.label)}
        className={flow}>
        <TabsList
          variant="line"
          data-not-typeset
          className="max-w-full justify-start overflow-x-auto">
          {items.map((item, i) => (
            <TabsTrigger
              key={i}
              value={String(i)}
              className="flex-none">
              <TabIcon label={item.props.label} />
              {item.props.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {items.map((item, i) => (
          // panels hold article content, so keep the prose size rather than the primitive's text-sm
          <TabsContent
            key={i}
            value={String(i)}
            className="text-(length:--text-body)">
            {item.props.children}
          </TabsContent>
        ))}
      </SyncedTabs>
    )
  },
  TabItem: ({ children }: TabItemProps) => <>{children}</>,
  FileTree: ({ children }: Children) => (
    // the tree is a nested markdown list
    <div
      className={`${flow} bg-card rounded-(--radius) border p-4 font-mono text-[0.8125rem] leading-[1.8] [&_:is(ul,li)]:m-0 [&_:is(ul,li)]:list-none [&_ul_ul]:pl-5 [&>ul]:p-0`}>
      {children}
    </div>
  ),
  Image: ({ src, alt }: { src: string; alt: string }) => (
    <Media src={src} alt={alt} />
  ),
}
