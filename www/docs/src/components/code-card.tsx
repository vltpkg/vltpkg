'use client'

import {
  BracesIcon,
  CheckIcon,
  CopyIcon,
  TerminalIcon,
} from 'lucide-react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { cn } from 'cn'
import { Vlt } from '@/components/icons/vlt'
import { Npm } from '@/components/icons/npm'
import { Pnpm } from '@/components/icons/pnpm'
import { Yarn } from '@/components/icons/yarn'
import { Bun } from '@/components/icons/bun'
import { Deno } from '@/components/icons/deno'
import { Button } from '@/components/ui/button'
import { useCopy } from '@/hooks/use-copy'
import { usePackageManagerTabs } from '@/hooks/use-preferred-package-manager'

const shells = new Set(['bash', 'sh', 'shell', 'zsh', 'console'])
const names: Record<string, string> = {
  ts: 'TypeScript',
  js: 'JavaScript',
  json: 'JSON',
  jsonc: 'JSON',
  yaml: 'YAML',
  toml: 'TOML',
  ini: 'INI',
  markdown: 'Markdown',
  mermaid: 'Mermaid',
  text: 'Text',
}

// tabs named after a package manager (e.g. a code-only <Tabs>) show its logo instead of the generic icon
const brands: Record<string, typeof Npm> = {
  vlt: Vlt,
  npm: Npm,
  pnpm: Pnpm,
  yarn: Yarn,
  bun: Bun,
  deno: Deno,
}

// `content` is what the <pre> shows: shiki's tokens from the server, or plain text
export type CodeTab = {
  code: string
  lang?: string
  title?: string
  content: React.ReactNode
}
type CodeCardProps = Omit<React.ComponentProps<'pre'>, 'children'> & {
  tabs: CodeTab[]
}

// the concave corner where the active tab meets the panel's top edge
const Corner = ({ side }: { side: 'left' | 'right' }) => (
  <span
    className={cn(
      'absolute bottom-0 size-4 bg-(--code-editor-background)',
      side === 'left' ? '-left-4' : '-right-4',
    )}>
    <span
      className={cn(
        'bg-card block size-full border-b',
        side === 'left' ?
          'rounded-br-xl border-r'
        : 'rounded-bl-xl border-l',
      )}
    />
  </span>
)

// a tab's label, plus the indicator that flows into the panel while it's active (`data-state` on the parent group)
const TabFace = ({
  tab: { lang = 'text', title },
  first,
  compact,
}: {
  tab: CodeTab
  first: boolean
  compact?: boolean
}) => {
  const terminal = shells.has(lang)
  const brand = title ? brands[title.toLowerCase()] : undefined
  const Icon = brand ?? (terminal ? TerminalIcon : BracesIcon)
  return (
    <>
      <span
        aria-hidden
        className="absolute inset-x-0 top-1 -bottom-px hidden rounded-t-xl border-x border-t bg-(--code-editor-background) group-data-[state=active]:block">
        {/* the first tab lines up with the panel's edge, so that side runs straight down */}
        {first ?
          <span className="absolute -bottom-4 -left-px size-4 border-l bg-(--code-editor-background)" />
        : <Corner side="left" />}
        <Corner side="right" />
      </span>
      <span className="text-muted-foreground group-data-[state=active]:text-foreground/75 group-data-[state=inactive]:group-hover:bg-foreground/5 group-data-[state=inactive]:group-hover:text-foreground group-focus-visible:ring-ring/50 relative mt-1 flex h-10 items-center gap-1.5 rounded-lg px-3 font-mono text-xs whitespace-nowrap group-focus-visible:ring-2">
        {/* a narrow card fits six tabs only without their icons */}
        <Icon
          aria-hidden
          className={cn(
            brand ? 'size-3.5' : 'size-3',
            brand || terminal ?
              'text-muted-foreground'
            : 'text-amber-600',
            compact && '@max-lg:hidden',
          )}
        />
        {title ?? (terminal ? 'Terminal' : (names[lang] ?? lang))}
      </span>
    </>
  )
}

// an editor card; more than one tab becomes a tablist whose active tab flows into the panel
export const CodeCard = ({
  tabs,
  className,
  ...props
}: CodeCardProps) => {
  const { copied, copy } = useCopy(1500)
  // package-manager tabs follow the stored preference, so every card on every page opens on the same one
  const { value, onValueChange } = usePackageManagerTabs(
    tabs.map(tab => tab.title),
  )
  const active = tabs[Number(value)] ?? tabs[0]

  const pre = (tab: CodeTab) => (
    <pre
      className={cn(
        'text-foreground overflow-x-auto rounded-xl border bg-(--code-editor-background) p-4 font-mono text-[13px] leading-snug [&_span]:text-(--shiki-light) dark:[&_span]:text-(--shiki-dark)',
        className,
      )}
      {...props}>
      {tab.content}
    </pre>
  )

  return (
    <figure
      data-not-typeset
      className="bg-card ring-border-illustration @container relative overflow-hidden rounded-2xl border border-transparent px-1 pb-1 shadow-lg ring-1 shadow-black/6.5 backdrop-blur [--code-editor-background:var(--color-illustration)]">
      {tabs.length === 1 ?
        <>
          <figcaption
            data-state="active"
            className="group relative h-11 w-fit">
            <TabFace tab={active} first />
          </figcaption>
          {pre(active)}
        </>
      : <TabsPrimitive.Root
          value={value}
          onValueChange={onValueChange}>
          <TabsPrimitive.List className="flex h-11 pr-9">
            {tabs.map((tab, i) => (
              <TabsPrimitive.Trigger
                key={i}
                value={String(i)}
                className="group relative h-11 shrink-0 outline-none">
                <TabFace tab={tab} first={i === 0} compact />
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>
          {tabs.map((tab, i) => (
            <TabsPrimitive.Content key={i} value={String(i)} asChild>
              {pre(tab)}
            </TabsPrimitive.Content>
          ))}
        </TabsPrimitive.Root>
      }
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => copy(active.code)}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className="text-muted-foreground absolute top-2 right-1.5">
        {copied ?
          <CheckIcon aria-hidden />
        : <CopyIcon aria-hidden />}
      </Button>
    </figure>
  )
}
