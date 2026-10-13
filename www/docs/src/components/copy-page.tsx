'use client'

import { useRef } from 'react'
import { DropdownMenu } from 'radix-ui'
import {
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  TerminalIcon,
} from 'lucide-react'
import { Claude } from '@/components/icons/claude'
import { Markdown } from '@/components/icons/markdown'
import { OpenAI } from '@/components/icons/openai'
import { Button } from '@/components/ui/button'
import { useCopy } from '@/hooks/use-copy'

const item =
  'text-muted-foreground flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm outline-none data-highlighted:bg-foreground/5 data-highlighted:text-foreground [&_svg]:size-4'

// prompts stay short and link to the markdown twin: query strings get long fast (claude-cli:// caps q at 5,000 chars).
// rendered only inside the open menu, so reading the origin never runs on the server
const AiActions = ({ url }: { url: string }) => {
  const md = `${window.location.origin}${url}.md`
  const q = encodeURIComponent(
    `Read ${md} so I can ask questions about it.`,
  )
  // claude-cli://open starts in the home directory, so have it ask for the project first
  const cli = encodeURIComponent(
    `Read ${md} from the vlt docs. Before changing anything, ask me which project to work in.`,
  )
  return (
    <>
      <DropdownMenu.Separator className="bg-border-illustration -mx-1 my-1 h-px" />
      <DropdownMenu.Item asChild className={item}>
        <a
          href={`https://claude.ai/new?q=${q}`}
          target="_blank"
          rel="noopener noreferrer">
          <Claude aria-hidden />
          Open in Claude
        </a>
      </DropdownMenu.Item>
      <DropdownMenu.Item asChild className={item}>
        <a
          href={`https://chatgpt.com/?hints=search&q=${q}`}
          target="_blank"
          rel="noopener noreferrer">
          <OpenAI aria-hidden />
          Open in ChatGPT
        </a>
      </DropdownMenu.Item>
      <DropdownMenu.Item asChild className={item}>
        <a href={`claude-cli://open?q=${cli}`}>
          <TerminalIcon aria-hidden />
          Open in Claude Code
        </a>
      </DropdownMenu.Item>
    </>
  )
}

// a split button in the code card's dress (components/code-card.tsx): the card is the frame, the copy action its
// inset panel, its corners the frame's radius less the padding. the page's `/<url>.md` twin (see next.config.ts rewrites) is what gets copied, viewed and linked
export const CopyPage = ({ url }: { url: string }) => {
  const { copied, copy } = useCopy(1500)
  const markdown = useRef<Promise<string>>(null)

  // fetch on hover/focus so the copy only awaits an already-settled promise;
  // Safari drops clipboard writes that happen too long after the click
  const load = () =>
    (markdown.current ??= fetch(`${url}.md`).then(res => res.text()))

  return (
    <div
      data-not-typeset
      className="bg-card ring-border-illustration flex shrink-0 items-center gap-0.5 rounded-xl p-0.5 shadow-lg ring-1 shadow-black/6.5">
      <Button
        variant="outline"
        size="sm"
        onPointerEnter={load}
        onFocus={load}
        onClick={async () => copy(await load())}
        className="bg-illustration text-foreground/75 hover:text-foreground rounded-[calc(var(--radius-xl)-2px)] active:not-aria-[haspopup]:translate-y-0">
        {copied ?
          <CheckIcon aria-hidden />
        : <CopyIcon aria-hidden />}
        {/* the label keeps its width (only the icon confirms, with use-copy's toast), so the frame never resizes */}
        Copy Page
      </Button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="More page actions"
            className="text-muted-foreground data-[state=open]:bg-foreground/5 data-[state=open]:text-foreground rounded-[calc(var(--radius-xl)-2px)]">
            <ChevronRightIcon
              aria-hidden
              className="transition-transform duration-200 ease-out group-data-[state=open]/button:rotate-90 motion-reduce:transition-none"
            />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="bg-card ring-border-illustration data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 min-w-52 rounded-xl p-1 shadow-lg ring-1 shadow-black/6.5">
            <DropdownMenu.Item asChild className={item}>
              <a
                href={`${url}.md`}
                target="_blank"
                rel="noopener noreferrer">
                <Markdown aria-hidden />
                View as Markdown
              </a>
            </DropdownMenu.Item>
            <AiActions url={url} />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}
