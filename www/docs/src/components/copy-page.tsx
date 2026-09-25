'use client'

import { useRef } from 'react'
import { DropdownMenu } from 'radix-ui'
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  FileTextIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCopy } from '@/hooks/use-copy'

const item =
  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-highlighted:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground'

// the page's `/<url>.md` twin (see next.config.ts rewrites): open it, or copy it
export const CopyPage = ({ url }: { url: string }) => {
  const { copied, copy } = useCopy(1500)
  const markdown = useRef<Promise<string>>(null)

  // fetch on hover/focus so the copy only awaits an already-settled promise;
  // Safari drops clipboard writes that happen too long after the click
  const load = () =>
    (markdown.current ??= fetch(`${url}.md`).then(res => res.text()))

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          onPointerEnter={load}
          onFocus={load}
          className="data-[state=open]:bg-muted shrink-0"
          data-not-typeset>
          {copied ?
            <CheckIcon aria-hidden />
          : <CopyIcon aria-hidden />}
          <span aria-live="polite">
            {copied ? 'Copied' : 'Copy page'}
          </span>
          <ChevronDownIcon aria-hidden className="opacity-60" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 min-w-52 rounded-lg border p-1 shadow-lg">
          <DropdownMenu.Item asChild className={item}>
            <a
              href={`${url}.md`}
              target="_blank"
              rel="noopener noreferrer">
              <FileTextIcon aria-hidden />
              View as Markdown
            </a>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={item}
            onSelect={async () => copy(await load())}>
            <CopyIcon aria-hidden />
            Copy page as Markdown
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
